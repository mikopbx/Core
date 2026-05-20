<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

declare(strict_types=1);

namespace MikoPBX\Core\Utilities;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * DNS resolver with a hard wall-clock timeout, capable of running N queries
 * concurrently in a single stream_select loop.
 *
 * PHP's built-in `dns_get_record()` is implemented over libresolv (or musl's
 * equivalent) and does NOT honour `default_socket_timeout`. On a slow or
 * unreachable nameserver it blocks for `options timeout:N attempts:M` from
 * `/etc/resolv.conf` (~10s by default), per nameserver, per query. Inside a
 * supervised worker that's enough to trip the WorkerSafeScriptsCore 120-second
 * watchdog and starve `module reload`s.
 *
 * Instead we shell out to BusyBox `nslookup` through `proc_open()` with a real
 * deadline: when the child overruns we `proc_terminate()` it with SIGKILL and
 * move on. The caller gets back what was parsed before the timeout.
 *
 * Two execution modes:
 *
 *   - Single-query convenience helpers ({@see resolveA}, {@see resolveAaaa},
 *     {@see resolveSrvTargets}) keep the simple "one host, one query, one
 *     answer" call shape for places that don't benefit from concurrency
 *     (legacy callers, tests).
 *
 *   - Batch mode {@see resolveBatch} spawns ALL provided queries as concurrent
 *     children and drains them with a single stream_select. Wall-clock cost
 *     is ~max(per_query_time), NOT ~sum, so a hostname's "3 SRV + 2N A/AAAA"
 *     full expansion drops from ~(3+2N)×timeout to ~2×timeout (two batched
 *     stages: SRV in parallel, then A+AAAA for all collected targets in
 *     parallel).
 */
final class DnsResolver
{
    /**
     * Default per-query deadline in seconds. Tight enough that a stuck
     * nameserver doesn't pin the worker, generous enough that a healthy
     * remote can answer over the public internet.
     */
    public const int DEFAULT_TIMEOUT_SEC = 3;

    /**
     * Hard cap on captured stdout bytes per query. Defends against a
     * pathological resolver that streams forever.
     */
    private const int MAX_OUTPUT_BYTES = 65536;

    /**
     * Cap on SRV targets returned per query. A single malicious or
     * misconfigured SRV record pointing to dozens of targets would otherwise
     * fan-out into N × 2 A/AAAA lookups, monopolising the resolver worker's
     * per-tick budget and starving other providers' refreshes.
     *
     * Real-world ITSP SRV deployments use at most a handful of targets per
     * service prefix (Twilio: ≤4 per region, Telnyx: ≤6); 10 covers every
     * legitimate deployment we have seen.
     */
    private const int MAX_SRV_TARGETS_PER_QUERY = 10;

    /**
     * stream_select poll window. Shorter = more iterations per second but
     * better SIGTERM responsiveness; longer = less CPU but more sluggish
     * shutdown. 250ms is the same value the original sequential loop used.
     */
    private const int POLL_WINDOW_USEC = 250_000;

    /**
     * Run an A-record query. Returns a deduplicated list of IPv4 literals.
     */
    public static function resolveA(string $hostname, int $timeoutSec = self::DEFAULT_TIMEOUT_SEC): array
    {
        $results = self::resolveBatch([['type' => 'A', 'name' => $hostname]], $timeoutSec);
        return $results[0] ?? [];
    }

    /**
     * Run an AAAA-record query. Returns a deduplicated list of IPv6 literals.
     */
    public static function resolveAaaa(string $hostname, int $timeoutSec = self::DEFAULT_TIMEOUT_SEC): array
    {
        $results = self::resolveBatch([['type' => 'AAAA', 'name' => $hostname]], $timeoutSec);
        return $results[0] ?? [];
    }

    /**
     * Run an SRV-record query. Returns a deduplicated list of target hostnames
     * (without weight/priority/port — caller resolves them via A/AAAA).
     *
     * @return string[] target hostnames, trailing FQDN dot stripped, lower-case
     */
    public static function resolveSrvTargets(string $srvName, int $timeoutSec = self::DEFAULT_TIMEOUT_SEC): array
    {
        $results = self::resolveBatch([['type' => 'SRV', 'name' => $srvName]], $timeoutSec);
        return $results[0] ?? [];
    }

    /**
     * Run N DNS queries concurrently under a SHARED wall-clock deadline.
     *
     * Spawns one nslookup child per query through proc_open, then drains all
     * stdout pipes from a single stream_select loop. Once a child exits we
     * parse its captured stdout into the appropriate result shape and place
     * it under the original $queries key. At the deadline any still-running
     * children are SIGKILLed and parsed from whatever they emitted so far.
     *
     * Wall-clock cost is ~max(per_query_time), not ~sum — this is the whole
     * point of the batch API.
     *
     * @param array<int|string,array{type: 'A'|'AAAA'|'SRV', name: string}> $queries
     * @return array<int|string,string[]> result keyed by the same keys as $queries.
     *         A/AAAA values are IP literal lists; SRV values are target hostname lists.
     *         Failed/timed-out queries return [].
     */
    public static function resolveBatch(array $queries, int $timeoutSec = self::DEFAULT_TIMEOUT_SEC): array
    {
        $results = [];
        foreach ($queries as $key => $_) {
            $results[$key] = [];
        }
        if (empty($queries)) {
            return $results;
        }

        $nslookup = Util::which('nslookup');
        if ($nslookup === '') {
            SystemMessages::sysLogMsg(__METHOD__, 'nslookup binary not found', LOG_ERR);
            return $results;
        }

        // Spawn all children up-front. Each entry: process resource, stdout/
        // stderr pipes, accumulated stdout, original query info.
        $running = [];
        foreach ($queries as $key => $q) {
            $type = $q['type'] ?? '';
            $name = trim((string)($q['name'] ?? ''));
            if ($name === '' || !in_array($type, ['A', 'AAAA', 'SRV'], true)) {
                continue;
            }

            // $nslookup is the trusted return of Util::which() — on stock MikoPBX
            // it is "/bin/busybox nslookup" (two whitespace-separated tokens) and
            // the shell MUST be allowed to reparse it. $type is from a fixed
            // whitelist above; $name is user/admin-influenced and is single-
            // quoted by escapeshellarg.
            $cmd = sprintf(
                '%s -type=%s %s',
                $nslookup,
                escapeshellarg($type),
                escapeshellarg($name)
            );

            $descriptors = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];
            $pipes = [];
            $process = proc_open($cmd, $descriptors, $pipes);
            if (!is_resource($process)) {
                continue;
            }
            // No stdin needed — close immediately so nslookup builds that
            // accept interactive mode do not block on input.
            fclose($pipes[0]);
            stream_set_blocking($pipes[1], false);
            stream_set_blocking($pipes[2], false);

            $running[(string)$key] = [
                'process'  => $process,
                'stdoutPipe' => $pipes[1],
                'stderrPipe' => $pipes[2],
                'stdout'   => '',
                'type'     => $type,
                'name'     => $name,
                'truncated'=> false,
            ];
        }

        $deadline = microtime(true) + max(1, $timeoutSec);

        while (!empty($running)) {
            // Build the read set fresh each iteration; stream_select rewrites
            // the array in place to keep only ready streams, so we cannot
            // reuse it across iterations.
            //
            // Stream-to-child mapping uses an int-keyed indirection table so
            // arbitrary characters in the original query key (dots, double
            // underscores, …) cannot collide with the delimiter scheme. Even
            // indices map to stdout, odd to stderr; the original $running key
            // is recovered via integer division by 2.
            $readSet = [];
            $streamOwner = [];  // int index → original $running key
            $i = 0;
            foreach ($running as $rkey => $r) {
                $readSet[$i]     = $r['stdoutPipe'];
                $streamOwner[$i] = $rkey;
                $i++;
                $readSet[$i]     = $r['stderrPipe'];
                $streamOwner[$i] = $rkey;  // marker; we discard stderr anyway
                $i++;
            }
            $write  = null;
            $except = null;

            $remaining = $deadline - microtime(true);
            $waitUs = $remaining > 0
                ? (int)min(self::POLL_WINDOW_USEC, $remaining * 1_000_000)
                : 0;

            $ready = @stream_select($readSet, $write, $except, 0, max(0, $waitUs));
            if ($ready === false) {
                // EINTR — signal interrupted the syscall. Back off briefly so
                // a stuck signal cannot tighten the loop into a busy-wait.
                usleep(10_000);
            } else {
                foreach ($readSet as $idx => $stream) {
                    $chunk = @fread($stream, 8192);
                    if ($chunk === false || $chunk === '') {
                        continue;
                    }
                    $isStderr = ($idx % 2) === 1;
                    if ($isStderr) {
                        continue; // stderr discarded — nslookup chatter is noise here
                    }
                    $origKey = $streamOwner[$idx];
                    if (!isset($running[$origKey])) {
                        continue; // child already harvested by a later iteration
                    }
                    $running[$origKey]['stdout'] .= $chunk;
                    if (strlen($running[$origKey]['stdout']) > self::MAX_OUTPUT_BYTES) {
                        // Byte-aligned truncation may cut mid-line — drop the
                        // incomplete trailing line so the parser only sees
                        // whole records.
                        $running[$origKey]['stdout'] = substr(
                            $running[$origKey]['stdout'],
                            0,
                            self::MAX_OUTPUT_BYTES
                        );
                        $lastNl = strrpos($running[$origKey]['stdout'], "\n");
                        if ($lastNl !== false) {
                            $running[$origKey]['stdout'] = substr(
                                $running[$origKey]['stdout'],
                                0,
                                $lastNl
                            );
                        }
                        $running[$origKey]['truncated'] = true;
                        $results[self::originalKey($origKey, $queries)] = self::parseOutput(
                            $running[$origKey]['stdout'],
                            $running[$origKey]['type']
                        );
                        self::terminateAndClose($running[$origKey], sigkill: true);
                        unset($running[$origKey]);
                    }
                }
            }

            // Reap children that exited on their own.
            foreach (array_keys($running) as $origKey) {
                $status = proc_get_status($running[$origKey]['process']);
                if ($status['running']) {
                    continue;
                }
                // Drain any tail bytes that landed between the last select and now.
                $running[$origKey]['stdout'] .= (string)@stream_get_contents($running[$origKey]['stdoutPipe']);
                $results[self::originalKey($origKey, $queries)] = self::parseOutput(
                    $running[$origKey]['stdout'],
                    $running[$origKey]['type']
                );
                self::terminateAndClose($running[$origKey], sigkill: false);
                unset($running[$origKey]);
            }

            if (microtime(true) >= $deadline) {
                break;
            }
        }

        // Kill anything still running and parse whatever they emitted so far.
        if (!empty($running)) {
            foreach ($running as $origKey => $r) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'nslookup -type=%s %s exceeded %ds shared deadline — terminated',
                        $r['type'],
                        $r['name'],
                        $timeoutSec
                    ),
                    LOG_INFO
                );
                $r['stdout'] .= (string)@stream_get_contents($r['stdoutPipe']);
                $results[self::originalKey($origKey, $queries)] = self::parseOutput(
                    $r['stdout'],
                    $r['type']
                );
                self::terminateAndClose($r, sigkill: true);
            }
        }

        return $results;
    }

    /**
     * Resolve the key used inside the running-process map back to the original
     * $queries key. PHP automatically normalises numeric string array keys
     * into int (so `$running["0"] = ...` lands at index 0 (int), and
     * `array_keys($running)` yields ints) — the parameter type must accept
     * both forms even though we always store via `(string)` at insertion.
     */
    private static function originalKey(int|string $key, array $queries): int|string
    {
        if (array_key_exists($key, $queries)) {
            return $key;
        }
        // Integer / numeric string interchange.
        $strKey = (string)$key;
        if (array_key_exists($strKey, $queries)) {
            return $strKey;
        }
        if (ctype_digit($strKey) && array_key_exists((int)$strKey, $queries)) {
            return (int)$strKey;
        }
        return $key;
    }

    /**
     * Dispatch on query type and parse the captured stdout.
     */
    private static function parseOutput(string $stdout, string $type): array
    {
        return match ($type) {
            'A'    => self::parseAddressOutput($stdout, isIpv6: false),
            'AAAA' => self::parseAddressOutput($stdout, isIpv6: true),
            'SRV'  => self::parseSrvOutput($stdout),
            default => [],
        };
    }

    /**
     * Parse `nslookup -type=A` / `-type=AAAA` output into a deduplicated
     * IP-literal list. Both BusyBox and GNU emit `Address: <ip>` lines for
     * answers (the very first `Address:` is the server line and is filtered
     * out because it follows `Server:`).
     *
     * Public for unit testing — the runtime caller is parseOutput().
     */
    public static function parseAddressOutput(string $stdout, bool $isIpv6): array
    {
        $lines = preg_split('/\R+/', $stdout) ?: [];
        $skipNextAddress = false;
        $ips = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                $skipNextAddress = false;
                continue;
            }
            // The server-identification block is "Server:\nAddress: 127.0.0.1#53"
            // — exclude the first Address that follows a Server line.
            if (stripos($line, 'Server:') === 0) {
                $skipNextAddress = true;
                continue;
            }
            if (stripos($line, 'Address') === 0 && preg_match('/^Address[^:]*:\s*([^\s]+)/i', $line, $m)) {
                if ($skipNextAddress) {
                    $skipNextAddress = false;
                    continue;
                }
                $ip = $m[1];
                // BusyBox sometimes prints "<ip>#<port>"; strip the port.
                $ip = explode('#', $ip, 2)[0];
                if (
                    ($isIpv6 && IpAddressHelper::isIpv6($ip)) ||
                    (!$isIpv6 && IpAddressHelper::isIpv4($ip))
                ) {
                    $ips[$ip] = true;
                }
                continue;
            }
            $skipNextAddress = false;
        }
        return array_keys($ips);
    }

    /**
     * Parse `nslookup -type=SRV` output into a deduplicated list of target
     * hostnames, capped at MAX_SRV_TARGETS_PER_QUERY.
     *
     * BusyBox format: `_sip._udp.example.com   service = 10 100 5060 sip1.example.com.`
     * Some builds print `srv = ...` instead of `service = ...`.
     *
     * Targets are filtered against a strict DNS-label whitelist
     * `[a-z0-9._-]` with a 253-byte length cap (RFC 1035 max hostname).
     * A poisoned resolver returning shell metacharacters, control bytes
     * or unbounded strings cannot reach downstream nslookup / Redis-key
     * code paths through this parser, even though both downstream call
     * sites perform their own escaping.
     *
     * Public for unit testing — the runtime caller is parseOutput().
     */
    public static function parseSrvOutput(string $stdout): array
    {
        $targets = [];
        if (preg_match_all('/(?:service|srv)\s*=\s*\d+\s+\d+\s+\d+\s+(\S+)/i', $stdout, $matches)) {
            foreach ($matches[1] as $target) {
                $target = strtolower(rtrim(trim($target), '.'));
                if ($target === '' || strlen($target) > 253) {
                    continue;
                }
                // Strict DNS-label whitelist — letters, digits, dot, hyphen,
                // underscore (underscore appears in service-prefix labels).
                if (preg_match('/^[a-z0-9._-]+$/', $target) !== 1) {
                    continue;
                }
                $targets[$target] = true;
                if (count($targets) >= self::MAX_SRV_TARGETS_PER_QUERY) {
                    break;
                }
            }
        }
        return array_keys($targets);
    }

    /**
     * Close pipes and reap a running-process map entry. If $sigkill is true,
     * send SIGKILL first — proc_close blocks on waitpid(), which can hang
     * indefinitely if the child is wedged in a syscall.
     *
     * @param array{process: resource, stdoutPipe: resource, stderrPipe: resource} $entry
     */
    private static function terminateAndClose(array $entry, bool $sigkill): void
    {
        if ($sigkill) {
            @proc_terminate($entry['process'], 9);
        }
        @fclose($entry['stdoutPipe']);
        @fclose($entry['stderrPipe']);
        @proc_close($entry['process']);
    }
}

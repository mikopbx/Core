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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Utilities\DnsResolver;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPJSIPIdentifyAction;
use Throwable;

/**
 * Periodically resolves SIP-provider hostnames to literal IPs and feeds them
 * into the identify-match cache consumed by SIPConf::generateProviderIdentify().
 *
 * Why this exists
 * ---------------
 * res_pjsip_endpoint_identifier_ip resolves `match=` once at module load via the
 * PJLIB DNS resolver and does NOT re-resolve on its own. A DNS failure at boot
 * leaves identify empty forever, and incoming calls from hostname-based
 * providers (Mango, Novofon, any SRV-only ITSP) fall into anonymous.
 *
 * This worker decouples DNS resolution from Asterisk's load path:
 *   1. SIPConf records the list of hostname-shaped provider hosts into
 *      CACHE_KEY_PENDING_HOSTS each time pjsip.conf is generated.
 *   2. We tick every CHECK_INTERVAL_SECONDS, read that list, resolve each host
 *      via SRV (`_sip._udp / _sip._tcp / _sips._tcp`) → A/AAAA on every target,
 *      then fall back to a plain A/AAAA on the bare hostname if SRV yielded
 *      nothing.
 *   3. We compare the new IP set against the cached one. On real change we
 *      update the cache and trigger ReloadPJSIPIdentifyAction, which
 *      regenerates pjsip.conf (so identify match= picks up the new IPs) and
 *      issues only `module reload res_pjsip_endpoint_identifier_ip.so` — no
 *      full PJSIP reload, no impact on active calls or registrations.
 *
 * Safety rules
 * ------------
 * - Empty resolution result is NEVER written. We keep the last known-good IPs
 *   so a transient DNS outage does not blank identify and break incoming
 *   calls. The cache entry has a 7-day TTL precisely so it survives reboots
 *   spanning short outages.
 * - DNS queries are bounded by a real wall-clock deadline. See
 *   {@see \MikoPBX\Core\Utilities\DnsResolver}: we shell out to BusyBox
 *   `nslookup` through proc_open() and SIGKILL the child if it overruns,
 *   because PHP's dns_get_record() honours neither `default_socket_timeout`
 *   nor any other PHP-level knob — it just blocks inside libresolv/musl.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerSipDnsResolver extends WorkerBase
{
    /**
     * Cache interval: 5 minutes. WorkerSafeScriptsCore launches this worker
     * every 60 seconds (KEEP_ALLIVE_CHECK_INTERVAL); actual DNS work happens
     * only when the throttle cache key has expired.
     */
    private const int CHECK_INTERVAL_SECONDS = 300;

    /**
     * Cap on hostnames processed per tick. Defensive: a sudden surge of
     * providers (e.g., mass-import) should not stall this worker on a slow
     * DNS server. Remaining hosts will be picked up on the next tick.
     */
    private const int MAX_HOSTS_PER_TICK = 50;

    /**
     * Per-DNS-query deadline (seconds). Enforced for real by DnsResolver
     * via proc_open + SIGKILL on overrun — independent of PHP ini knobs.
     */
    private const int DNS_TIMEOUT_SEC = 3;

    /**
     * Circuit-breaker threshold. When this many hostnames in a row fail to
     * produce any IPs from DNS (every stage of resolveSrvWithFallback timed
     * out with empty result), we conclude the resolver is wedged and bail
     * out of the tick with a single LOG_WARNING.
     *
     * Without this, a fully unreachable DNS would let the tick run host-by-
     * host until the throttle key expiry naturally caps respawn cadence at
     * one tick per CHECK_INTERVAL_SECONDS. The WorkerSafeScriptsCore 120s
     * watchdog protects the SUPERVISOR loop, not individual workers, so a
     * single long-running tick will simply burn its full host budget. The
     * circuit breaker turns 12 wasted seconds (4 hosts × 3s = ~12s) into
     * an early exit so the next throttle window starts cleanly.
     *
     * 5 is chosen so transient single-host issues (typo'd hostname, NXDOMAIN
     * on one provider) cannot trip the breaker — only a pattern across
     * multiple unrelated providers, which is the signature of resolver-side
     * trouble.
     */
    private const int MAX_CONSECUTIVE_FAILURES = 5;

    /**
     * Throttle key. Stored on RedisClientProvider (DB1) so a FLUSHDB of the
     * application cache (DB4) does NOT reset our tick cadence — pending and
     * resolved entries live in the same namespace and we want them all to
     * survive together.
     */
    private const string CACHE_KEY_LAST_TICK = 'Workers:WorkerSipDnsResolver:lastTick';

    /**
     * Cadence override consumed by WorkerSafeScriptsCore. Default base-class
     * value is 60s, which would re-spawn this worker 4 times per useful
     * tick; the throttle key still short-circuits the extra spawns, but
     * each one pays fork/exec/autoload overhead. Returning the real cadence
     * lets the supervisor skip those wasted spawns.
     */
    public static function getCheckInterval(): int
    {
        return self::CHECK_INTERVAL_SECONDS;
    }

    public function start(array $argv): void
    {
        $cache = $this->di->get(RedisClientProvider::SERVICE_NAME);

        // raw \Redis::get returns string|false. A throttle key set previously
        // (any non-false value) means we tick too soon and must wait.
        if ($cache->get(self::CACHE_KEY_LAST_TICK) !== false) {
            return;
        }

        // Write the throttle key BEFORE the work, not after. A long-running
        // tick that crashes (or the host being SIGKILLed for any reason)
        // would otherwise leave the next cron-spawned worker with no
        // throttle, and it would start a second concurrent pass over the
        // same hostnames, wasting DNS budget and triggering duplicate
        // ReloadPJSIPIdentifyAction runs. Writing it first means a crashed
        // tick pays one 5-minute cooldown, which is the right trade-off
        // for a DNS refresher.
        //
        // Concurrent resolveAll() runs are nevertheless safe (last-writer-
        // wins on identical canonical payloads, and ReloadPJSIPIdentifyAction
        // is mutex-protected) — the throttle is for efficiency, not
        // correctness.
        //
        // The value '1' is a placeholder — only the key's presence is consulted.
        $cache->setex(self::CACHE_KEY_LAST_TICK, self::CHECK_INTERVAL_SECONDS, '1');

        $this->resolveAll($cache);
    }

    /**
     * Single resolution pass.
     *
     * @param \Redis $cache raw phpredis client from RedisClientProvider
     */
    private function resolveAll(\Redis $cache): void
    {
        $raw = $cache->get(SIPConf::CACHE_KEY_PENDING_HOSTS);
        if (!is_string($raw) || $raw === '') {
            return;
        }
        $pending = json_decode($raw, true);
        if (!is_array($pending) || empty($pending)) {
            return;
        }

        // Bound the lookup budget — hostnames beyond the cap wait for next tick.
        $pending = array_slice(array_unique($pending), 0, self::MAX_HOSTS_PER_TICK);

        // Two outcomes drive different reload scopes:
        //   - identifySetChanged: any hostname's resolved IP set changed.
        //     identify match= in pjsip.conf must be rewritten, but the
        //     incoming-context name (built from the canonical IP) may still
        //     be the same — narrow reload of res_pjsip_endpoint_identifier_ip
        //     is enough.
        //   - canonicalChanged: the SMALLEST IP for some hostname changed.
        //     getIncomingContextId() now produces a different context name,
        //     so extensions.conf must be regenerated and dialplan reloaded —
        //     otherwise the new pjsip.conf endpoint.context references a
        //     section that no longer exists in dialplan memory (issue #1066
        //     redux but the other direction).
        $identifySetChanged = false;
        $canonicalChanged = false;
        $consecutiveFailures = 0;
        foreach ($pending as $rawHost) {
            // Honour SIGTERM/SIGUSR1 between hosts. Without this, a slow DNS
            // path × 50 hosts could outlive the WorkerSafeScriptsCore 120s
            // watchdog and we'd be SIGKILLed mid-resolve.
            pcntl_signal_dispatch();
            if ($this->needRestart) {
                break;
            }

            $hostKey = SIPConf::normalizeHostnameKey((string)$rawHost);
            if ($hostKey === '') {
                continue;
            }
            $outcome = $this->resolveHost($hostKey, $cache);
            if ($outcome['changed']) {
                $identifySetChanged = true;
            }
            if ($outcome['canonicalChanged']) {
                $canonicalChanged = true;
            }

            // Circuit breaker: tally consecutive DNS-empty results. resolveHost
            // returns 'resolved' = true whenever DNS produced at least one IP
            // (regardless of whether it differed from cache); 'resolved' = false
            // only when every stage of resolveSrvWithFallback timed out empty.
            // Five in a row across unrelated hostnames means the resolver, not
            // the providers, is the problem — abort the tick now and let the
            // throttle key (CHECK_INTERVAL_SECONDS) coalesce the next attempt.
            if ($outcome['resolved']) {
                $consecutiveFailures = 0;
            } else {
                $consecutiveFailures++;
                if ($consecutiveFailures >= self::MAX_CONSECUTIVE_FAILURES) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        sprintf(
                            'Aborting DNS-refresh tick after %d consecutive empty resolves — '
                                . 'resolver appears unhealthy; next attempt in %ds',
                            $consecutiveFailures,
                            self::CHECK_INTERVAL_SECONDS
                        ),
                        LOG_WARNING
                    );
                    break;
                }
            }
        }

        // NOTE: while the topology hash stays dirty, ReloadPJSIPIdentifyAction bails
        // before generateConfig() and never stamps the applied signature, so this
        // level check re-enqueues canonicalChanged every tick until an external full
        // ReloadPJSIPAction reconciles the topology and a stamp finally lands. That
        // repeated enqueue is intended (each retry bails cheaply), not churn.
        //
        // Level trigger (issue #1091): edge detection above only fires on the
        // single tick that observes a hostname's resolved IP change. If the
        // reload that tick spawned bailed (dirty topology hash) or lost the
        // mutex to a dialplan-only writer, pjsip.conf endpoint.context is left
        // stranded on the cold hostname name while extensions.conf later moves
        // to the resolved-IP name — and no future tick sees a diff because the
        // cache is already warm. Compare the live canonical signature against
        // the one the LAST SUCCESSFUL reload stamped; a mismatch means the
        // on-disk configs are stale regardless of per-tick DNS movement, so we
        // must regenerate both files until they converge.
        $liveSignature = SIPConf::computeResolvedCanonicalSignature();
        if ($liveSignature !== '') {
            $appliedSignature = $cache->get(SIPConf::CACHE_KEY_APPLIED_SIGNATURE);
            $appliedSignature = is_string($appliedSignature) ? $appliedSignature : '';
            if ($liveSignature !== $appliedSignature) {
                $canonicalChanged = true;
            } else {
                // Already consistent — refresh the marker's TTL so a steady state
                // with no DNS movement (no reload to re-stamp it) does not let it
                // expire after CACHE_TTL_RESOLVED and then read back as '', which
                // would fire one pointless full reload per TTL window. Re-writing
                // the same value is safe and keeps the "applied" invariant intact.
                $cache->setex(
                    SIPConf::CACHE_KEY_APPLIED_SIGNATURE,
                    SIPConf::CACHE_TTL_RESOLVED,
                    $appliedSignature
                );
            }
        }

        if ($identifySetChanged || $canonicalChanged) {
            $this->triggerReloads($canonicalChanged);
        }
    }

    /**
     * Resolve one hostname, compare to cache, write through on real change.
     *
     * Returns a small status struct so the caller can decide the reload scope
     * and detect resolver-wide trouble:
     *   - 'changed'          (bool) — the IP set differs from cache (drives
     *                        identify reload)
     *   - 'canonicalChanged' (bool) — the SMALLEST IP changed (drives the
     *                        broader dialplan reload, because that smallest
     *                        IP feeds getIncomingContextId() and therefore
     *                        the context name written into pjsip.conf and
     *                        extensions.conf must stay in sync)
     *   - 'resolved'         (bool) — DNS produced at least one IP (regardless
     *                        of whether it differed from cache). False ONLY
     *                        when the last-known-good guard kicked in because
     *                        every stage of resolveSrvWithFallback came back
     *                        empty. Drives the circuit breaker in resolveAll.
     *
     * @param \Redis $cache raw phpredis client from RedisClientProvider
     * @return array{changed: bool, canonicalChanged: bool, resolved: bool}
     */
    private function resolveHost(string $hostKey, \Redis $cache): array
    {
        $unresolved = ['changed' => false, 'canonicalChanged' => false, 'resolved' => false];

        try {
            $resolved = $this->resolveSrvWithFallback($hostKey);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "DNS resolve raised exception for $hostKey: " . $e->getMessage(),
                LOG_WARNING
            );
            return $unresolved;
        }

        if (empty($resolved['ips'])) {
            // Last-known-good guard: never blank a cached entry just because
            // this lookup failed. Operator gets an INFO note (NXDOMAIN/timeout
            // during a 30-second blip should not spam NOTICE-level logs); the
            // previous IPs remain authoritative until the next successful
            // resolve refreshes them.
            SystemMessages::sysLogMsg(
                __METHOD__,
                "DNS returned no addresses for $hostKey — keeping last known-good IPs",
                LOG_INFO
            );
            return $unresolved;
        }

        $cacheKey = SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey;

        // raw \Redis::get returns string|false. JSON-decode for our payload.
        $rawPrevious = $cache->get($cacheKey);
        $previous = null;
        if (is_string($rawPrevious) && $rawPrevious !== '') {
            $decoded = json_decode($rawPrevious, true);
            if (is_array($decoded)) {
                $previous = $decoded;
            }
        }
        $previousIps = (is_array($previous) && isset($previous['ips']) && is_array($previous['ips']))
            ? $previous['ips']
            : [];

        $newIps = $resolved['ips'];
        sort($newIps);
        sort($previousIps);

        // Canonical payload shape — never echo back $previous as-is, even
        // when nothing changed (see code-review item Warning-4: a corrupted
        // previous value must not propagate just because we're refreshing).
        $payload = ['ips' => $newIps, 'at' => time(), 'src' => $resolved['src']];
        $encoded = json_encode($payload);
        if ($encoded === false) {
            // json_encode failure on a plain IP array is unreachable in
            // practice; treat as "DNS gave us something but we cannot
            // persist it" — non-failure for circuit-breaker purposes.
            return ['changed' => false, 'canonicalChanged' => false, 'resolved' => true];
        }

        if ($newIps === $previousIps) {
            // No change — only refresh the TTL so the entry survives even if
            // pjsip.conf is not regenerated for a long time. DNS DID resolve
            // successfully, so reset the consecutive-failure counter upstream.
            $cache->setex($cacheKey, SIPConf::CACHE_TTL_RESOLVED, $encoded);
            return ['changed' => false, 'canonicalChanged' => false, 'resolved' => true];
        }

        $cache->setex($cacheKey, SIPConf::CACHE_TTL_RESOLVED, $encoded);

        // After sort() the smallest IP is index 0. This is the canonical IP
        // that getIncomingContextId() embeds into the incoming-context name
        // (issue #1066 fix). If it differs from the previous canonical, the
        // context-name baked into both pjsip.conf and extensions.conf will
        // shift and the dialplan needs regenerating — not just identify.
        $previousCanonical = $previousIps[0] ?? null;
        $newCanonical      = $newIps[0];
        $canonicalChanged  = $previousCanonical !== $newCanonical;

        SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                "DNS update for %s via %s: [%s] → [%s]%s",
                $hostKey,
                $resolved['src'],
                implode(',', $previousIps),
                implode(',', $newIps),
                $canonicalChanged ? ' (canonical IP changed → dialplan reload required)' : ''
            ),
            LOG_INFO
        );

        return ['changed' => true, 'canonicalChanged' => $canonicalChanged, 'resolved' => true];
    }

    /**
     * SRV lookup against the three standard SIP service prefixes; falls back
     * to a bare A/AAAA on the hostname when SRV yields nothing. Returns:
     *   ['ips' => string[], 'src' => 'SRV'|'A']
     *
     * Two-stage batch:
     *   stage 1 — 3 SRV queries (_sip._udp/_tcp/_sips._tcp) run concurrently;
     *   stage 2 — A + AAAA for every collected target run concurrently;
     *   stage 3 — bare A + AAAA on the host itself, concurrent (only when
     *             stages 1+2 produced no IPs).
     *
     * Wall-clock per host on the HAPPY PATH is ~2 × DNS_TIMEOUT_SEC (one
     * concurrent SRV stage + one concurrent address stage), independent of
     * the number of SRV targets — this is the DoS hardening that motivated
     * the rewrite.
     *
     * WORST CASE is ~3 × DNS_TIMEOUT_SEC (= 9s with DNS_TIMEOUT_SEC=3) when
     * every stage hits its deadline. With MAX_HOSTS_PER_TICK=50 that is a
     * theoretical 7.5-minute tick. The circuit breaker
     * (MAX_CONSECUTIVE_FAILURES=5) aborts the tick once it becomes clear
     * the resolver is wedged, and the throttle key (written BEFORE work
     * in start(), see Warning-5 fix) prevents respawn for
     * CHECK_INTERVAL_SECONDS=300s. Hosts not visited in an aborted tick
     * are picked up on the next 5-minute cycle.
     */
    private function resolveSrvWithFallback(string $hostKey): array
    {
        // Stage 1: concurrent SRV across the three SIP service prefixes.
        $srvQueries = [
            'udp' => ['type' => 'SRV', 'name' => '_sip._udp.' . $hostKey],
            'tcp' => ['type' => 'SRV', 'name' => '_sip._tcp.' . $hostKey],
            'tls' => ['type' => 'SRV', 'name' => '_sips._tcp.' . $hostKey],
        ];
        $srvResults = DnsResolver::resolveBatch($srvQueries, self::DNS_TIMEOUT_SEC);

        // Dedup targets across the three prefixes — many ITSPs publish the
        // same target hostnames under UDP and TCP, and there is no point
        // resolving the same A/AAAA twice.
        $targets = [];
        foreach ($srvResults as $list) {
            foreach ($list as $target) {
                $targets[$target] = true;
            }
        }

        if (!empty($targets)) {
            // Stage 2a: concurrent A + AAAA across every collected target.
            $addrQueries = [];
            foreach (array_keys($targets) as $target) {
                $addrQueries["{$target}__A"]    = ['type' => 'A',    'name' => $target];
                $addrQueries["{$target}__AAAA"] = ['type' => 'AAAA', 'name' => $target];
            }
            $addrResults = DnsResolver::resolveBatch($addrQueries, self::DNS_TIMEOUT_SEC);
            $ips = [];
            foreach ($addrResults as $list) {
                $ips = array_merge($ips, $list);
            }
            if (!empty($ips)) {
                return ['ips' => $this->uniqueValidIps($ips), 'src' => 'SRV'];
            }
            // SRV produced targets but none resolved — fall through to bare A/AAAA
            // (rare in practice; happens on partial DNS outages mid-stage).
        }

        // Stage 2b: bare A/AAAA on the hostname itself, also concurrent.
        $bareResults = DnsResolver::resolveBatch(
            [
                'A'    => ['type' => 'A',    'name' => $hostKey],
                'AAAA' => ['type' => 'AAAA', 'name' => $hostKey],
            ],
            self::DNS_TIMEOUT_SEC
        );
        $ips = array_merge($bareResults['A'] ?? [], $bareResults['AAAA'] ?? []);
        return ['ips' => $this->uniqueValidIps($ips), 'src' => 'A'];
    }

    /**
     * De-duplicate and filter to publicly routable IPv4/IPv6 only.
     *
     * Threat model: an attacker controlling a provider's DNS (or
     * performing DNS poisoning) could otherwise return `A 127.0.0.1`
     * or `A 10.x.x.x` and have the worker write that into
     * `pjsip:identify:resolved:<host>`, which then becomes
     * `identify match=` in pjsip.conf — letting attacker-controlled
     * traffic from loopback or internal networks pretend to be the
     * legitimate ITSP. The same attack works on the IPv6 side via 6to4
     * (2002::/16) encoding of an internal IPv4 address.
     *
     * Filter (delegated to IpAddressHelper::isPublicIp):
     *   - IPv4: rejects loopback, RFC1918 (10/8, 172.16/12, 192.168/16),
     *     link-local (169.254/16), Class E reserved, broadcast — via
     *     PHP's FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE.
     *     Additionally rejects CGNAT (100.64/10, RFC 6598), multicast
     *     (224.0.0.0/4, RFC 5771), and TEST-NET-{1,2,3} (192.0.2.0/24,
     *     198.51.100.0/24, 203.0.113.0/24, RFC 5737) — PHP's filter
     *     flags do NOT cover these, so explicit checks in
     *     IpAddressHelper::isPublicIp close the gap (round N+1 security
     *     review). A DNS-poisoning attacker who shares a CGNAT block
     *     with the victim PBX could otherwise inject their own IP into
     *     pjsip identify match= and gain inbound SIP trust.
     *   - IPv6: requires global unicast 2000::/3 AND rejects 6to4
     *     (2002::/16), Teredo (2001:0000::/32), documentation prefix
     *     (2001:db8::/32), Benchmarking (2001:2::/48), ORCHIDv1
     *     (2001:10::/28) and ORCHIDv2 (2001:20::/28) — see
     *     IpAddressHelper::isGlobalUnicast.
     *
     * Providers that legitimately use private peering configure their
     * match-IPs through `m_SipHosts` (IP/CIDR direct, bypasses DNS).
     */
    private function uniqueValidIps(array $ips): array
    {
        $valid = [];
        foreach ($ips as $ip) {
            $ip = (string)$ip;
            if (IpAddressHelper::isPublicIp($ip)) {
                $valid[$ip] = true;
            }
        }
        return array_keys($valid);
    }

    /**
     * Inline-trigger the narrow reload action.
     *
     * `ReloadPJSIPIdentifyAction` regenerates pjsip.conf and reloads only
     * res_pjsip_endpoint_identifier_ip — active calls and registrations
     * unaffected. When $canonicalChanged is true the same action ALSO
     * regenerates extensions.conf (inside the same mutex, so pjsip.conf
     * endpoint.context and the dialplan section name never disagree); see
     * the action for the rationale.
     *
     * We invoke in-process rather than queueing through WorkerModelsEvents
     * because (a) the change is already debounced by the 5-minute tick, and
     * (b) the action itself is cheap (~50-300ms typical).
     */
    private function triggerReloads(bool $canonicalChanged): void
    {
        try {
            (new ReloadPJSIPIdentifyAction())->execute([
                'canonicalChanged' => $canonicalChanged,
            ]);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'ReloadPJSIPIdentifyAction failed: ' . $e->getMessage(),
                LOG_ERR
            );
        }
    }
}

// Start a worker process
WorkerSipDnsResolver::startWorker($argv ?? []);

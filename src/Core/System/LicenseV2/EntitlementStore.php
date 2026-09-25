<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Core\System\LicenseV2;

use Closure;
use RuntimeException;

/**
 * Keeps the entitlement token of this installation: builds signed requests (online and
 * file-based offline exchange use the same request), accepts server answers, and answers
 * "what is licensed right now" with a clock that never goes backwards.
 */
class EntitlementStore
{
    /** Wait at least this long before the next retry after a failure, seconds. */
    public const int BACKOFF_MIN = 300;
    /** Never wait longer than this between retries, seconds. */
    public const int BACKOFF_MAX = 21600;
    /** Metrics ride along with a request at most once in this many seconds. */
    public const int METRICS_INTERVAL = 86400;

    private const string TOKEN_FILE = 'entitlement.token';
    private const string STATE_FILE = 'state.json';
    private const string NONCE_ONLINE = 'nonceOnline';
    private const string NONCE_OFFLINE = 'nonceOffline';
    private const string NEXT_RETRY = 'nextRetry';
    private const string BACKOFF = 'backoff';
    /** State key suffix: what the request of a nonce slot reported, settled by its answer. */
    private const string REPORT_SUFFIX = 'Report';
    private const string METRICS_SENT_AT = 'metricsSentAt';
    private const string ROUND_LOCK_FILE = 'refresh.lock';

    /** Do not rewrite the state file more often than this, seconds. */
    private const int CLOCK_PERSIST_STEP = 60;

    private Closure $clock;

    public function __construct(
        private readonly string $dir,
        private readonly InstallationIdentity $identity,
        private readonly string $serverPublicKeyPem,
        ?Closure $clock = null
    ) {
        $this->clock = $clock ?? time(...);
    }

    /**
     * Builds a request signed by the installation key. The nonce is remembered:
     * only an answer to this very request will be accepted.
     *
     * Online refresh and the file-based offline exchange keep separate nonces, so the hourly
     * refresh does not invalidate a request file the administrator has already exported.
     *
     * @param array{usage?: array<string, array<string, int>>, holders?: array<int, array<string, mixed>>,
     *     metrics?: array<string, mixed>} $report Signed along with the request. A part given empty is sent
     *     empty ("nothing held"); a part left out is unknown to the PBX and the server keeps what it had.
     * @param array<string, mixed> $marks Opaque, kept with the nonce and handed back by acceptAnswer() (SeatLedger::report()).
     * @return array{request: string, sig: string}
     */
    public function buildRequest(
        string $licenseKey,
        string $pbxVersion,
        bool $offline = false,
        array $report = [],
        array $marks = []
    ): array {
        $nonce = bin2hex(random_bytes(16));
        $slot = $offline ? self::NONCE_OFFLINE : self::NONCE_ONLINE;
        $parts = $report;
        if (isset($parts['usage'])) {
            // Feature ids stay JSON object keys even when one of them looks like a list index.
            $parts['usage'] = (object)$parts['usage'];
        }
        $request = EntitlementToken::base64UrlEncode((string)json_encode([
            'v' => EntitlementToken::VERSION,
            'install' => $this->identity->getInstallId(),
            'pubkey' => $this->identity->getPublicKeyPem(),
            'key' => $licenseKey,
            'nonce' => $nonce,
            'ts' => $this->now(),
            'pbx' => $pbxVersion,
        ] + $parts));
        $this->saveState([
            $slot => $nonce,
            // Counters only, never holders: this file lives on the /cf flash.
            $slot . self::REPORT_SUFFIX => ['marks' => $marks, 'metrics' => isset($report['metrics'])],
        ]);
        return [
            'request' => $request,
            'sig' => EntitlementToken::base64UrlEncode($this->identity->sign($request)),
        ];
    }

    /**
     * Accepts the server answer to the pending request.
     *
     * @return array{payload: array<string, mixed>, marks: array<string, mixed>}
     *     The accepted payload and the marks its request was built with, for SeatLedger::reportAccepted().
     * @throws TokenRejectedException When the token is forged, replayed, stale or foreign.
     * @throws RuntimeException When the state can not be locked or written.
     */
    public function acceptAnswer(string $token): array
    {
        $payload = EntitlementToken::decodeVerified($token, $this->serverPublicKeyPem, $this->identity->getInstallId());
        // Freshness is judged by the clock as it was before this token: a token dated in the
        // future must be refused, not allowed to drag the clock anchor after itself. Read before
        // the lock below: now() may itself persist the clock anchor via saveState(), and a second
        // flock() on the same file within this process would deadlock against our own lock.
        $now = $this->now();
        return $this->withLock(function () use ($token, $payload, $now): array {
            $state = $this->loadState();
            $answeredSlot = '';
            foreach ([self::NONCE_ONLINE, self::NONCE_OFFLINE] as $slot) {
                $pendingNonce = (string)($state[$slot] ?? '');
                if ($pendingNonce !== '' && hash_equals($pendingNonce, (string)($payload['nonce'] ?? ''))) {
                    $answeredSlot = $slot;
                }
            }
            if ($answeredSlot === '') {
                throw new TokenRejectedException('Entitlement token does not answer the pending request');
            }
            if (!EntitlementToken::isFresh($payload, $now)) {
                throw new TokenRejectedException('Entitlement token is expired or the PBX clock is wrong');
            }
            $this->writeAtomically(self::TOKEN_FILE, trim($token));
            $sent = (array)($state[$answeredSlot . self::REPORT_SUFFIX] ?? []);
            $changes = [
                $answeredSlot => '',
                $answeredSlot . self::REPORT_SUFFIX => [],
                'refused' => false,
                'lastSeen' => max($now, (int)$payload['iat']),
                self::BACKOFF => 0,
                self::NEXT_RETRY => 0,
            ];
            if (($sent['metrics'] ?? false) === true) {
                $changes[self::METRICS_SENT_AT] = $now;
            }
            // The nonce is spent only by an accepted token, a refused one leaves the request pending.
            $this->saveState($changes, true);
            return ['payload' => $payload, 'marks' => (array)($sent['marks'] ?? [])];
        });
    }

    /**
     * @return array<string, mixed> Accepted payload.
     * @throws TokenRejectedException
     * @throws RuntimeException
     */
    public function acceptToken(string $token): array
    {
        return $this->acceptAnswer($token)['payload'];
    }

    /** Whether the next request should carry the daily metrics. */
    public function metricsDue(): bool
    {
        return $this->now() >= (int)($this->loadState()[self::METRICS_SENT_AT] ?? 0) + self::METRICS_INTERVAL;
    }

    /**
     * Runs one online round alone. A second process finding the round taken skips it (null) instead of
     * replacing the nonce the first one waits an answer for, or noting a failure after its success.
     * Its own lock file: the round calls now() and buildRequest(), which take the state lock themselves.
     */
    public function exclusiveRound(Closure $round): mixed
    {
        // Only root workers keep the state; a round from the web user could not store its nonce anyway.
        if (!is_writable($this->dir)) {
            return null;
        }
        $lock = fopen("$this->dir/" . self::ROUND_LOCK_FILE, 'c');
        if ($lock === false) {
            return null;
        }
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            fclose($lock);
            return null;
        }
        try {
            return $round();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * Payload with a valid signature, possibly expired; null when there is no trustworthy token.
     * An expired payload still tells which modules are paid.
     *
     * @return array<string, mixed>|null
     */
    public function lastVerifiedPayload(): ?array
    {
        // No "@": workers report a suppressed warning as a shutdown error, so a missing file is asked about.
        $tokenFile = "$this->dir/" . self::TOKEN_FILE;
        if (!is_file($tokenFile)) {
            return null;
        }
        try {
            return EntitlementToken::decodeVerified(
                (string)file_get_contents($tokenFile),
                $this->serverPublicKeyPem,
                $this->identity->getInstallId()
            );
        } catch (RuntimeException) {
            return null;
        }
    }

    /**
     * @param string|null $licenseKey Current license key of the PBX; a token issued for another key
     *                                licenses nothing, so a key reset or transfer takes effect at once.
     * @param array<string, mixed>|null $payload Token to judge against, so a caller asking several
     *                                questions has them all answered by one document. Null reads and
     *                                verifies the stored token again.
     */
    public function featureAvailable(string $featureId, ?string $licenseKey = null, ?array $payload = null): bool
    {
        // A signed refusal revokes the stored token at once; only the next accepted token licenses again.
        if (($this->loadState()['refused'] ?? false) === true) {
            return false;
        }
        $payload ??= $this->lastVerifiedPayload();
        $now = $this->now();
        return $payload !== null
            && ($licenseKey === null || hash_equals($licenseKey, (string)($payload['key'] ?? '')))
            && EntitlementToken::isFresh($payload, $now, true)
            && EntitlementToken::featureValid($payload, $featureId, $now);
    }

    /**
     * The licensing server has answered the pending online request and said no: nothing is licensed
     * from now on, grace included, until a token is accepted again. The refusal must be signed; a bare
     * HTTP error may come from any proxy on the way and is not a refusal. The nonce is checked and the
     * refusal stored under one lock, so a refusal to a request a newer token has superseded revokes nothing.
     *
     * @return string Reason given by the server.
     * @throws RuntimeException When the refusal is not authentic or answers another request.
     */
    public function acceptRefusal(string $signedRefusal): string
    {
        $payload = EntitlementToken::decodeSigned($signedRefusal, $this->serverPublicKeyPem, $this->identity->getInstallId());
        return $this->withLock(function () use ($payload): string {
            $pendingNonce = (string)($this->loadState()[self::NONCE_ONLINE] ?? '');
            if (
                ($payload['refused'] ?? false) !== true
                || $pendingNonce === ''
                || !hash_equals($pendingNonce, (string)($payload['nonce'] ?? ''))
            ) {
                throw new RuntimeException('Refusal does not answer the pending request');
            }
            $this->saveState([self::NONCE_ONLINE => '', 'refused' => true, self::BACKOFF => 0, self::NEXT_RETRY => 0], true);
            return (string)json_encode($payload['error'] ?? '');
        });
    }

    /** Whether the licensing servers may be asked now (the backoff after failures has passed). */
    public function retryAllowed(): bool
    {
        return $this->now() >= (int)($this->loadState()[self::NEXT_RETRY] ?? 0);
    }

    /**
     * All servers failed: wait longer before the next round (5 min, doubling to 6 h, +-25 % jitter),
     * so a fleet restarting behind a dead server does not hammer it in lockstep.
     *
     * @return int Seconds until the next attempt.
     * @throws RuntimeException
     */
    public function noteFailure(): int
    {
        // ponytail: the read and the write are not one transaction, so two workers failing at the
        // same moment may both read the same backoff and one doubling is lost — the fleet then
        // waits half as long once. Take the state lock around the whole method if it ever matters.
        $previous = (int)($this->loadState()[self::BACKOFF] ?? 0);
        $backoff = min(self::BACKOFF_MAX, max(self::BACKOFF_MIN, $previous * 2));
        $delay = (int)round($backoff * random_int(75, 125) / 100);
        $this->saveState([self::BACKOFF => $backoff, self::NEXT_RETRY => $this->now() + $delay]);
        return $delay;
    }

    /**
     * Until when the stored token licenses anything: exp, or offlineUntil while the servers are
     * unreachable; 0 after a signed refusal, without a usable token or on key mismatch.
     *
     * @param array<string, mixed>|null $payload Token to judge against; null reads the stored one.
     */
    public function effectiveExpiry(?string $licenseKey = null, ?array $payload = null): int
    {
        if (($this->loadState()['refused'] ?? false) === true) {
            return 0;
        }
        $payload ??= $this->lastVerifiedPayload();
        if ($payload === null || ($licenseKey !== null && !hash_equals($licenseKey, (string)($payload['key'] ?? '')))) {
            return 0;
        }
        return max((int)($payload['exp'] ?? 0), (int)($payload['offlineUntil'] ?? 0));
    }

    /**
     * Wall clock that never goes backwards between calls and reboots.
     *
     * ponytail: root can edit state.json and rewind the anchor; the online path re-anchors
     * on every server answer, a closed contour relies on the token lifetime only.
     */
    public function now(): int
    {
        $wallClock = ($this->clock)();
        $lastSeen = (int)($this->loadState()['lastSeen'] ?? 0);
        // Only root workers own the state; the web server user reads the anchor they keep.
        if ($wallClock > $lastSeen + self::CLOCK_PERSIST_STEP && is_writable($this->dir)) {
            $this->saveState(['lastSeen' => $wallClock]);
        }
        return max($wallClock, $lastSeen);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadState(): array
    {
        $stateFile = "$this->dir/" . self::STATE_FILE;
        $state = is_file($stateFile) ? json_decode((string)file_get_contents($stateFile), true) : null;
        return is_array($state) ? $state : [];
    }

    /**
     * Read-modify-write under a lock, so concurrent workers do not lose each other's changes.
     *
     * @param array<string, mixed> $changes
     * @param bool $locked The caller already holds the state lock (via withLock()) — write
     *                      directly instead of taking it again, which would deadlock: flock()
     *                      on a second descriptor of the same file blocks against itself within
     *                      one process.
     * @throws RuntimeException
     */
    private function saveState(array $changes, bool $locked = false): void
    {
        $write = function () use ($changes): void {
            $this->writeAtomically(self::STATE_FILE, (string)json_encode(array_merge($this->loadState(), $changes)));
        };
        $locked ? $write() : $this->withLock($write);
    }

    /**
     * Runs $body with the state file locked, so a multi-step read-check-write (e.g. importing a
     * token: nonce check, token write, nonce spend) is atomic against concurrent importers.
     *
     * @throws RuntimeException
     */
    private function withLock(Closure $body): mixed
    {
        if (!is_writable($this->dir)) {
            throw new RuntimeException("License state in $this->dir is written by root workers only");
        }
        $lock = fopen("$this->dir/" . self::STATE_FILE . '.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException("Can not lock the license state in $this->dir");
        }
        try {
            return $body();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * Readers take no locks: rename() shows them either the old or the new content, never a torn one.
     *
     * @throws RuntimeException
     */
    private function writeAtomically(string $fileName, string $content): void
    {
        $temporaryFile = "$this->dir/$fileName." . bin2hex(random_bytes(4)) . '.tmp';
        if (
            file_put_contents($temporaryFile, $content) !== strlen($content)
            || !rename($temporaryFile, "$this->dir/$fileName")
        ) {
            if (is_file($temporaryFile)) {
                unlink($temporaryFile);
            }
            throw new RuntimeException("Can not write $fileName to $this->dir");
        }
    }
}

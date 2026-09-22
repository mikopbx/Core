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

    private const string TOKEN_FILE = 'entitlement.token';
    private const string STATE_FILE = 'state.json';
    private const string NONCE_ONLINE = 'nonceOnline';
    private const string NONCE_OFFLINE = 'nonceOffline';
    private const string NEXT_RETRY = 'nextRetry';
    private const string BACKOFF = 'backoff';

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
     * @return array{request: string, sig: string}
     */
    public function buildRequest(string $licenseKey, string $pbxVersion, bool $offline = false): array
    {
        $nonce = bin2hex(random_bytes(16));
        $request = EntitlementToken::base64UrlEncode((string)json_encode([
            'v' => EntitlementToken::VERSION,
            'install' => $this->identity->getInstallId(),
            'pubkey' => $this->identity->getPublicKeyPem(),
            'key' => $licenseKey,
            'nonce' => $nonce,
            'ts' => $this->now(),
            'pbx' => $pbxVersion,
        ]));
        $this->saveState([$offline ? self::NONCE_OFFLINE : self::NONCE_ONLINE => $nonce]);
        return [
            'request' => $request,
            'sig' => EntitlementToken::base64UrlEncode($this->identity->sign($request)),
        ];
    }

    /**
     * Accepts the server answer to the pending request.
     *
     * @return array<string, mixed> Accepted payload.
     * @throws RuntimeException When the token is forged, replayed, stale or foreign.
     */
    public function acceptToken(string $token): array
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
                throw new RuntimeException('Entitlement token does not answer the pending request');
            }
            if (!EntitlementToken::isFresh($payload, $now)) {
                throw new RuntimeException('Entitlement token is expired or the PBX clock is wrong');
            }
            $this->writeAtomically(self::TOKEN_FILE, trim($token));
            // The nonce is spent only by an accepted token, a refused one leaves the request pending.
            $this->saveState([
                $answeredSlot => '',
                'refused' => false,
                'lastSeen' => max($now, (int)$payload['iat']),
                self::BACKOFF => 0,
                self::NEXT_RETRY => 0,
            ], true);
            return $payload;
        });
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
     */
    public function featureAvailable(string $featureId, ?string $licenseKey = null): bool
    {
        $payload = $this->lastVerifiedPayload();
        $now = $this->now();
        // Grace covers unreachable servers only; after an explicit refusal the token lives till exp.
        $withGrace = ($this->loadState()['refused'] ?? false) !== true;
        return $payload !== null
            && ($licenseKey === null || hash_equals($licenseKey, (string)($payload['key'] ?? '')))
            && EntitlementToken::isFresh($payload, $now, $withGrace)
            && EntitlementToken::featureValid($payload, $featureId, $now);
    }

    /**
     * The licensing server has answered the pending online request and said no: the offline grace
     * period no longer applies. The refusal must be signed; a bare HTTP error may come from any
     * proxy on the way and is not a refusal.
     *
     * @return string Reason given by the server.
     * @throws RuntimeException When the refusal is not authentic or answers another request.
     */
    public function acceptRefusal(string $signedRefusal): string
    {
        $installId = $this->identity->getInstallId();
        $payload = EntitlementToken::decodeSigned($signedRefusal, $this->serverPublicKeyPem, $installId);
        $pendingNonce = (string)($this->loadState()[self::NONCE_ONLINE] ?? '');
        if (
            ($payload['refused'] ?? false) !== true
            || $pendingNonce === ''
            || !hash_equals($pendingNonce, (string)($payload['nonce'] ?? ''))
        ) {
            throw new RuntimeException('Refusal does not answer the pending request');
        }
        $this->saveState([self::NONCE_ONLINE => '', 'refused' => true, self::BACKOFF => 0, self::NEXT_RETRY => 0]);
        return (string)json_encode($payload['error'] ?? '');
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
     */
    public function noteFailure(): int
    {
        $previous = (int)($this->loadState()[self::BACKOFF] ?? 0);
        $backoff = min(self::BACKOFF_MAX, max(self::BACKOFF_MIN, $previous * 2));
        $delay = (int)round($backoff * random_int(75, 125) / 100);
        $this->saveState([self::BACKOFF => $backoff, self::NEXT_RETRY => $this->now() + $delay]);
        return $delay;
    }

    /**
     * Until when the stored token licenses anything: exp, or offlineUntil while the servers are
     * unreachable and no signed refusal has arrived. 0 without a usable token or on key mismatch.
     */
    public function effectiveExpiry(?string $licenseKey = null): int
    {
        $payload = $this->lastVerifiedPayload();
        if ($payload === null || ($licenseKey !== null && !hash_equals($licenseKey, (string)($payload['key'] ?? '')))) {
            return 0;
        }
        $withGrace = ($this->loadState()['refused'] ?? false) !== true;
        $until = (int)($payload['exp'] ?? 0);
        return $withGrace ? max($until, (int)($payload['offlineUntil'] ?? 0)) : $until;
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

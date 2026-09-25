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
 * Seat leases of this PBX: a session per device, a lease per feature, renewed by keepalive.
 * Knows nothing about tokens or servers; the caller passes the limit it read from the signed token.
 * It also keeps what the licensing server is told on the next report: per feature the peak of seats
 * since the last accepted answer and a running count of refusals with the boundary the server has
 * confirmed (see report(), reportAccepted()).
 *
 * Every public method is one transaction under a lock on a stable lock file:
 * lock -> read and validate -> expire -> check -> mutate -> write -> unlock.
 * A corrupt file fails closed: it is set aside as seats.json.corrupt and the call throws.
 *
 * ponytail: one global lock and a full rewrite per call; sized for ~200 devices with keepalive
 * every TTL/3. Beyond that the ledger moves into a daemon with in-memory state.
 */
class SeatLedger
{
    public const int TTL_DEFAULT = 300;
    public const int TTL_MIN = 60;
    public const int TTL_MAX = 3600;
    public const int HOLDER_MAX_BYTES = 1024;

    private const string FILE = 'seats.json';
    private const int FILE_VERSION = 1;

    private Closure $clock;

    public function __construct(private readonly string $dir, ?Closure $clock = null)
    {
        $this->clock = $clock ?? time(...);
    }

    /**
     * @param array<string, mixed> $holder Who holds the session (hostname, username, process...), report only.
     * @return string Session id.
     * @throws RuntimeException When the ttl or the holder is out of bounds.
     * @throws SessionCeilingException When the ledger already holds as many sessions as it may.
     */
    public function startSession(array $holder, int $ttl, int $maxSessions): string
    {
        if ($ttl < self::TTL_MIN || $ttl > self::TTL_MAX) {
            throw new RuntimeException('Session ttl must be between ' . self::TTL_MIN . ' and ' . self::TTL_MAX);
        }
        $holderJson = json_encode($holder);
        if ($holderJson === false || strlen($holderJson) > self::HOLDER_MAX_BYTES) {
            throw new RuntimeException('Session holder is too large or not encodable');
        }
        return $this->transaction(function (array &$ledger, int $now) use ($holder, $ttl, $maxSessions): string {
            if (count($ledger['sessions']) >= $maxSessions) {
                throw new SessionCeilingException('Too many license sessions');
            }
            $id = bin2hex(random_bytes(16));
            $ledger['sessions'][$id] = [
                'holder' => $holder, 'ttl' => $ttl, 'expires' => $now + $ttl, 'features' => [], 'started' => $now,
            ];
            return $id;
        });
    }

    /**
     * Takes a seat of the feature, or, with $limit null (a feature licensed per installation),
     * only checks that the session is alive. Never renews the lease: keepalive() is the single
     * door that re-checks the rights, and nothing may stay alive without passing through it.
     *
     * @param int|null $limit Seats the feature is licensed for; null counts no seats.
     * @return int Seconds left on the lease.
     * @throws SeatException 1021 unknown or expired session, 1051 no free seat.
     */
    public function capture(string $sessionId, string $featureId, ?int $limit): int
    {
        $leaseLeft = $this->transaction(function (array &$ledger, int $now) use ($sessionId, $featureId, $limit): ?int {
            $this->liveSession($ledger, $sessionId);
            $features = $ledger['sessions'][$sessionId]['features'];
            if ($limit !== null && !in_array($featureId, $features, true)) {
                $ledger['report'][$featureId] ??= ['peak' => 0, 'denied' => 0, 'acked' => 0];
                $used = $this->countSeats($ledger, $featureId);
                if ($used >= $limit) {
                    // Counted for the server's shortage report. The transaction writes the ledger only
                    // when its body returns, so the refusal is returned here and thrown after it.
                    $ledger['report'][$featureId]['denied']++;
                    return null;
                }
                $ledger['sessions'][$sessionId]['features'][] = $featureId;
                $ledger['sessions'][$sessionId]['captured'][$featureId] = $now;
                $ledger['report'][$featureId]['peak'] = max($ledger['report'][$featureId]['peak'], $used + 1);
            }
            return $ledger['sessions'][$sessionId]['expires'] - $now;
        });
        if ($leaseLeft === null) {
            throw new SeatException('No free seats for the feature', SeatException::NO_SEATS);
        }
        return $leaseLeft;
    }

    /**
     * @return array<string, int> featureId => seats in use.
     */
    public function usage(): array
    {
        return $this->transaction(function (array &$ledger): array {
            $usage = [];
            foreach ($ledger['sessions'] as $session) {
                foreach ($session['features'] as $featureId) {
                    $usage[$featureId] = ($usage[$featureId] ?? 0) + 1;
                }
            }
            return $usage;
        });
    }

    /**
     * What the next request tells the server, and the marks to settle it with.
     * usage: per feature, seats in use now, the most held at once since the last accepted answer and
     * the refusals the server has not confirmed yet; features with nothing to say are left out.
     * marks: the generation of this ledger file and the running refusal count per feature at this moment,
     * handed back to reportAccepted().
     *
     * @return array{usage: array<string, array{used: int, peak: int, denied: int}>,
     *     marks: array{gen: string, denied: array<string, int>}}
     */
    public function report(): array
    {
        return $this->transaction(function (array &$ledger): array {
            $usage = [];
            $marks = ['gen' => $ledger['gen'], 'denied' => []];
            foreach ($ledger['report'] as $featureId => $counters) {
                $featureId = (string)$featureId;
                $usage[$featureId] = [
                    'used' => 0,
                    'peak' => $counters['peak'],
                    'denied' => $counters['denied'] - $counters['acked'],
                ];
                $marks['denied'][$featureId] = $counters['denied'];
            }
            foreach ($ledger['sessions'] as $session) {
                foreach ($session['features'] as $featureId) {
                    $usage[$featureId] ??= ['used' => 0, 'peak' => 0, 'denied' => 0];
                    $usage[$featureId]['used']++;
                }
            }
            foreach ($usage as $featureId => $counters) {
                $usage[$featureId]['peak'] = max($counters['peak'], $counters['used']);
            }
            return [
                'usage' => array_filter($usage, static fn(array $c): bool => $c['used'] + $c['peak'] + $c['denied'] > 0),
                'marks' => $marks,
            ];
        });
    }

    /**
     * Who holds seats, for the cabinet monitor. The session id stays on the PBX: the server sees
     * ref() only, and a holder field named like ours can not replace it.
     *
     * @return array<int, array<string, mixed>>
     */
    public function holders(): array
    {
        return $this->transaction(function (array &$ledger): array {
            $holders = [];
            foreach ($ledger['sessions'] as $id => $session) {
                if ($session['features'] === []) {
                    continue;
                }
                $holders[] = [
                    'ref' => self::ref((string)$id),
                    'features' => $session['features'],
                    'since' => (int)($session['started'] ?? 0),
                ] + $session['holder'];
            }
            return $holders;
        });
    }

    /**
     * Frees the holders the server asked for; unknown refs are skipped (the holder may be gone already).
     * The holder learns it on its next keepalive (1021) and starts a new session.
     *
     * @param array<int, string> $refs
     */
    public function drop(array $refs): void
    {
        if ($refs === []) {
            return;
        }
        $this->transaction(function (array &$ledger) use ($refs): void {
            foreach (array_keys($ledger['sessions']) as $id) {
                if (in_array(self::ref((string)$id), $refs, true)) {
                    unset($ledger['sessions'][$id]);
                }
            }
        });
    }

    /**
     * The server accepted a report: refusals up to its marks are confirmed and the peak starts again
     * from the seats in use now. The boundary only moves forward and never past what happened, so an
     * online answer and a file answer covering the same refusals neither repeat nor lose any.
     * Entries are kept once a feature was limited: one per feature, and dropping one would let an old
     * mark confirm refusals of its successor. Marks of another generation — taken before the file was
     * set aside as corrupt and started again — confirm nothing: those counts belong to a file that is gone.
     *
     * ponytail: the peak is reset by any accepted answer; with online and file answers interleaving, a peak
     * between them may go unreported. Per-nonce peaks if closed contours ever mix with online for real.
     *
     * @param array{gen?: string, denied?: array<string, int>} $marks What report() returned for the answered request.
     */
    public function reportAccepted(array $marks): void
    {
        $this->transaction(function (array &$ledger) use ($marks): void {
            $sameGeneration = hash_equals($ledger['gen'], (string)($marks['gen'] ?? ''));
            foreach ($ledger['report'] as $featureId => $counters) {
                $featureId = (string)$featureId;
                $mark = $sameGeneration ? (int)($marks['denied'][$featureId] ?? 0) : 0;
                $ledger['report'][$featureId] = [
                    'peak' => $this->countSeats($ledger, $featureId),
                    'denied' => $counters['denied'],
                    'acked' => min($counters['denied'], max($counters['acked'], $mark)),
                ];
            }
        });
    }

    /** How the server names a session: its id never leaves the PBX. */
    public static function ref(string $sessionId): string
    {
        return substr(hash('sha256', $sessionId), 0, 16);
    }

    /**
     * Renews the lease: expires = now + ttl (frequent calls do not stack), drops the listed features.
     *
     * @param array<int, string> $droppedFeatures
     * @return int Seconds left on the lease.
     * @throws SeatException 1021 unknown or expired session.
     */
    public function keepalive(string $sessionId, array $droppedFeatures = []): int
    {
        return $this->transaction(function (array &$ledger, int $now) use ($sessionId, $droppedFeatures): int {
            $this->liveSession($ledger, $sessionId);
            $ledger['sessions'][$sessionId]['features'] = array_values(
                array_diff($ledger['sessions'][$sessionId]['features'], $droppedFeatures)
            );
            $ledger['sessions'][$sessionId]['expires'] = $now + $ledger['sessions'][$sessionId]['ttl'];
            return $ledger['sessions'][$sessionId]['ttl'];
        });
    }

    /** Idempotent: an unknown session or a feature it never held is not an error. */
    public function release(string $sessionId, string $featureId): void
    {
        $this->transaction(function (array &$ledger) use ($sessionId, $featureId): void {
            if (isset($ledger['sessions'][$sessionId])) {
                $ledger['sessions'][$sessionId]['features'] = array_values(
                    array_diff($ledger['sessions'][$sessionId]['features'], [$featureId])
                );
            }
        });
    }

    /** Idempotent. */
    public function endSession(string $sessionId): void
    {
        $this->transaction(function (array &$ledger) use ($sessionId): void {
            unset($ledger['sessions'][$sessionId]);
        });
    }

    /**
     * @return array<int, string>
     * @throws SeatException 1021
     */
    public function sessionFeatures(string $sessionId): array
    {
        return $this->transaction(function (array &$ledger) use ($sessionId): array {
            $this->liveSession($ledger, $sessionId);
            return $ledger['sessions'][$sessionId]['features'];
        });
    }

    /**
     * Whether this session is beyond the new limit and must give the feature back: true when at
     * least $limit other live sessions took it no later than this one. Asking by rank instead of
     * "am I the very latest" is what lets one keepalive round shed the whole excess: with a limit
     * cut to one, every holder but the oldest answers true at once.
     *
     * The comparison is "no later" and not "earlier" on purpose: capture times have a granularity
     * of one second, and holders of the same second must all give the seat back rather than all
     * keep it — a cut by one seat may then free two, but the excess never outlives its TTL.
     */
    public function isOverLimit(string $sessionId, string $featureId, int $limit): bool
    {
        return $this->transaction(function (array &$ledger) use ($sessionId, $featureId, $limit): bool {
            $mine = $this->capturedAt($ledger['sessions'][$sessionId] ?? [], $featureId);
            if ($mine === null) {
                return false;
            }
            $olderHolders = 0;
            foreach ($ledger['sessions'] as $id => $session) {
                $theirs = $id === $sessionId ? null : $this->capturedAt($session, $featureId);
                // ponytail: seconds-granularity rank; a monotonic capture counter if freeing
                // one seat too many on a tie ever matters.
                $olderHolders += ($theirs !== null && $theirs <= $mine) ? 1 : 0;
            }
            return $olderHolders >= $limit;
        });
    }

    /**
     * When the session took a feature it still holds; null when it does not hold it. A session
     * written before 'captured' existed counts as the oldest holder, so it is shed last.
     *
     * @param array<string, mixed> $session
     */
    private function capturedAt(array $session, string $featureId): ?int
    {
        return in_array($featureId, (array)($session['features'] ?? []), true)
            ? (int)($session['captured'][$featureId] ?? 0)
            : null;
    }

    /**
     * @param array<string, mixed> $ledger
     * @throws SeatException When the session is unknown or expired.
     */
    private function liveSession(array $ledger, string $sessionId): void
    {
        if (!isset($ledger['sessions'][$sessionId])) {
            throw new SeatException('License session is unknown or expired', SeatException::NO_SESSION);
        }
    }

    /**
     * @param array<string, mixed> $ledger
     */
    private function countSeats(array $ledger, string $featureId): int
    {
        $count = 0;
        foreach ($ledger['sessions'] as $session) {
            if (in_array($featureId, $session['features'], true)) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Runs $body under the lock with the validated ledger; expired sessions are already removed.
     * The ledger is written back only when $body returns without throwing.
     *
     * @param Closure(array &$ledger, int $now): mixed $body
     * @throws RuntimeException
     */
    private function transaction(Closure $body): mixed
    {
        if (!is_dir($this->dir) && !mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            throw new RuntimeException("Can not create $this->dir");
        }
        $lock = fopen("$this->dir/" . self::FILE . '.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException("Can not lock the seat ledger in $this->dir");
        }
        if (!flock($lock, LOCK_EX)) {
            fclose($lock);
            throw new RuntimeException("Can not lock the seat ledger in $this->dir");
        }
        try {
            $ledger = $this->load();
            $now = ($this->clock)();
            // The clock went backwards (rollback, reboot with a wrong clock): no lease may outlive
            // its own ttl measured from this moment, so a rollback extends nothing beyond one ttl.
            if ($now < $ledger['wall']) {
                foreach ($ledger['sessions'] as &$session) {
                    $session['expires'] = min($session['expires'], $now + $session['ttl']);
                }
                unset($session);
            }
            $this->expire($ledger, $now);
            $result = $body($ledger, $now);
            // Written back even for read-only calls (usage/sessionFeatures): this is what keeps
            // 'wall' fresh so the rollback clamp above has a recent timestamp to compare against.
            $ledger['wall'] = $now;
            $this->write($ledger);
            return $result;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * @param array<string, mixed> $ledger
     */
    private function expire(array &$ledger, int $now): void
    {
        foreach ($ledger['sessions'] as $id => $session) {
            if ($session['expires'] <= $now) {
                unset($ledger['sessions'][$id]);
            }
        }
    }

    /**
     * A missing file is a fresh start; an unreadable or malformed one is set aside and refused.
     *
     * @return array{v: int, wall: int, sessions: array<string, array{
     *     holder: array<string, mixed>, ttl: int, expires: int, features: array<int, string>,
     *     captured?: array<string, int>, started?: int
     * }>, report: array<string, array{peak: int, denied: int, acked: int}>, gen: string}
     * @throws RuntimeException
     */
    private function load(): array
    {
        $file = "$this->dir/" . self::FILE;
        if (!is_file($file)) {
            return ['v' => self::FILE_VERSION, 'wall' => 0, 'sessions' => [], 'report' => [], 'gen' => bin2hex(random_bytes(8))];
        }
        $ledger = json_decode((string)file_get_contents($file), true);
        if (!$this->isWellFormed($ledger)) {
            if (rename($file, "$file.corrupt")) {
                throw new RuntimeException('Seat ledger is corrupt, set aside as ' . self::FILE . '.corrupt');
            }
            if (!unlink($file)) {
                throw new RuntimeException('Seat ledger is corrupt and could not be set aside or removed');
            }
            throw new RuntimeException('Seat ledger is corrupt and could not be set aside; removed instead');
        }
        // 'report' and 'gen' are younger than the file format: a ledger written before them starts
        // with no counters and a generation of its own (written back by the transaction).
        $ledger['report'] ??= [];
        $ledger['gen'] ??= bin2hex(random_bytes(8));
        return $ledger;
    }

    private function isWellFormed(mixed $ledger): bool
    {
        if (
            !is_array($ledger) || ($ledger['v'] ?? null) !== self::FILE_VERSION
            || !is_int($ledger['wall'] ?? null) || !is_array($ledger['sessions'] ?? null)
            || !is_string($ledger['gen'] ?? '')
        ) {
            return false;
        }
        foreach ($ledger['sessions'] as $id => $session) {
            if (
                !is_string($id) || !is_array($session)
                || !is_array($session['holder'] ?? null) || !is_int($session['ttl'] ?? null)
                || !is_int($session['expires'] ?? null) || !is_array($session['features'] ?? null)
                // 'captured' and 'started' are younger than the file format: absent is fine, malformed is not.
                || !is_array($session['captured'] ?? [])
                || !is_int($session['started'] ?? 0)
            ) {
                return false;
            }
        }
        if (!is_array($ledger['report'] ?? [])) {
            return false;
        }
        foreach ($ledger['report'] ?? [] as $counters) {
            if (
                !is_array($counters) || !is_int($counters['peak'] ?? null)
                || !is_int($counters['denied'] ?? null) || !is_int($counters['acked'] ?? null)
            ) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $ledger
     * @throws RuntimeException
     * @throws \JsonException When the ledger can not be encoded (nothing is written).
     */
    private function write(array $ledger): void
    {
        $file = "$this->dir/" . self::FILE;
        $content = json_encode($ledger, JSON_THROW_ON_ERROR);
        $temporary = "$file." . bin2hex(random_bytes(4)) . '.tmp';
        if (
            file_put_contents($temporary, $content) !== strlen($content)
            || !chmod($temporary, 0600)
            || !rename($temporary, $file)
        ) {
            if (is_file($temporary)) {
                unlink($temporary);
            }
            throw new RuntimeException("Can not write the seat ledger to $this->dir");
        }
    }
}

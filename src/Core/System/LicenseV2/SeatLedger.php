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
     * @throws RuntimeException When the ttl, the holder or the number of sessions is out of bounds.
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
                throw new RuntimeException('Too many license sessions');
            }
            $id = bin2hex(random_bytes(16));
            $ledger['sessions'][$id] = ['holder' => $holder, 'ttl' => $ttl, 'expires' => $now + $ttl, 'features' => []];
            return $id;
        });
    }

    /**
     * @return int Seconds left on the lease.
     * @throws SeatException 1021 unknown or expired session, 1051 no free seat.
     */
    public function capture(string $sessionId, string $featureId, int $limit): int
    {
        return $this->transaction(function (array &$ledger, int $now) use ($sessionId, $featureId, $limit): int {
            $this->liveSession($ledger, $sessionId);
            $features = $ledger['sessions'][$sessionId]['features'];
            if (!in_array($featureId, $features, true)) {
                if ($this->countSeats($ledger, $featureId) >= $limit) {
                    throw new SeatException('No free seats for the feature', SeatException::NO_SEATS);
                }
                $ledger['sessions'][$sessionId]['features'][] = $featureId;
            }
            return $ledger['sessions'][$sessionId]['expires'] - $now;
        });
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
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException("Can not lock the seat ledger in $this->dir");
        }
        try {
            $ledger = $this->load();
            $now = ($this->clock)();
            $this->expire($ledger, $now);
            $result = $body($ledger, $now);
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
     *     holder: array<string, mixed>, ttl: int, expires: int, features: array<int, string>
     * }>}
     * @throws RuntimeException
     */
    private function load(): array
    {
        $file = "$this->dir/" . self::FILE;
        if (!is_file($file)) {
            return ['v' => self::FILE_VERSION, 'wall' => 0, 'sessions' => []];
        }
        $ledger = json_decode((string)file_get_contents($file), true);
        if (!$this->isWellFormed($ledger)) {
            rename($file, "$file.corrupt");
            throw new RuntimeException('Seat ledger is corrupt, set aside as ' . self::FILE . '.corrupt');
        }
        return $ledger;
    }

    private function isWellFormed(mixed $ledger): bool
    {
        if (
            !is_array($ledger) || ($ledger['v'] ?? null) !== self::FILE_VERSION
            || !is_int($ledger['wall'] ?? null) || !is_array($ledger['sessions'] ?? null)
        ) {
            return false;
        }
        foreach ($ledger['sessions'] as $id => $session) {
            if (
                !is_string($id) || !is_array($session)
                || !is_array($session['holder'] ?? null) || !is_int($session['ttl'] ?? null)
                || !is_int($session['expires'] ?? null) || !is_array($session['features'] ?? null)
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

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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\FirewallBouncer;

use MikoPBX\PBXCoreREST\Lib\FirewallBouncer\ExportDecisionsAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Unit tests for the delta-tracking logic inside ExportDecisionsAction.
 *
 * The Redis-touching methods (`readPreviousSnapshot` / `writeCurrentSnapshot`)
 * are exercised end-to-end on the test host in Phase B re-run. Here we
 * cover the pure utility methods that drive the diff semantics:
 *
 *   - `isStartupRequest()`  — how `?startup=...` is parsed
 *   - `cursorKeyFor()`      — token-id → Redis cursor key mapping
 *   - `diffRemoved()`       — the actual previous-vs-current diff
 *
 * All three are static private — accessed via Reflection.
 */
final class ExportDecisionsActionDeltaTest extends TestCase
{
    private static function invoke(string $method, array $args): mixed
    {
        $ref = new ReflectionMethod(ExportDecisionsAction::class, $method);
        $ref->setAccessible(true);
        return $ref->invoke(null, ...$args);
    }

    /**
     * @dataProvider startupCases
     */
    public function testIsStartupRequestParsesQueryFlag(array $data, bool $expected): void
    {
        $this->assertSame($expected, self::invoke('isStartupRequest', [$data]));
    }

    public static function startupCases(): array
    {
        return [
            'startup=true (lowercase)'   => [['startup' => 'true'], true],
            'startup=True (mixed case)'  => [['startup' => 'True'], true],
            'startup=TRUE (uppercase)'   => [['startup' => 'TRUE'], true],
            'startup=false'              => [['startup' => 'false'], false],
            'startup is empty string'    => [['startup' => ''], false],
            'startup absent'             => [[], false],
            'startup=true as bool'       => [['startup' => true], true],
            'startup=false as bool'      => [['startup' => false], false],
            'startup garbage value'      => [['startup' => 'yes'], false],
        ];
    }

    public function testCursorKeyForUsesTokenIdWhenPresent(): void
    {
        $this->assertSame(
            'fwbouncer:cursor:5',
            self::invoke('cursorKeyFor', [['token_id' => 5]])
        );
    }

    public function testCursorKeyForCoercesStringTokenId(): void
    {
        // ApiKey id arrives as int from getTokenInfo(), but defend against
        // future plumbing that hands a numeric string through sessionContext.
        $this->assertSame(
            'fwbouncer:cursor:7',
            self::invoke('cursorKeyFor', [['token_id' => '7']])
        );
    }

    public function testCursorKeyForFallsBackToAnonWhenTokenIdMissing(): void
    {
        $this->assertSame(
            'fwbouncer:cursor:anon',
            self::invoke('cursorKeyFor', [[]])
        );
    }

    public function testCursorKeyForFallsBackToAnonWhenTokenIdNull(): void
    {
        $this->assertSame(
            'fwbouncer:cursor:anon',
            self::invoke('cursorKeyFor', [['token_id' => null]])
        );
    }

    public function testCursorKeyForFallsBackToAnonWhenTokenIdZero(): void
    {
        // token_id=0 is not a valid ApiKey row (id is identity, starts at 1).
        $this->assertSame(
            'fwbouncer:cursor:anon',
            self::invoke('cursorKeyFor', [['token_id' => 0]])
        );
    }

    public function testDiffRemovedReturnsEmptyWhenPreviousEmpty(): void
    {
        $current = [self::makeDecision(1, '1.1.1.1')];
        $this->assertSame([], self::invoke('diffRemoved', [[], $current]));
    }

    public function testDiffRemovedReturnsEmptyWhenSnapshotsIdentical(): void
    {
        $a = self::makeDecision(1, '1.1.1.1');
        $b = self::makeDecision(2, '2.2.2.2');
        $this->assertSame([], self::invoke('diffRemoved', [[$a, $b], [$a, $b]]));
    }

    public function testDiffRemovedReturnsRemovedDecisionsAsFullObjects(): void
    {
        $a = self::makeDecision(1, '1.1.1.1');
        $b = self::makeDecision(2, '2.2.2.2');
        $c = self::makeDecision(3, '3.3.3.3');

        // Previously had a,b,c — now only c. b and a were unbanned.
        $result = self::invoke('diffRemoved', [[$a, $b, $c], [$c]]);

        $this->assertCount(2, $result);
        $resultIds = array_map(static fn (array $d): int => (int)$d['id'], $result);
        $this->assertEqualsCanonicalizing([1, 2], $resultIds);

        // Each removed decision is returned as a full object so the
        // bouncer can evict by `value` (the IP), not just by id.
        foreach ($result as $removed) {
            $this->assertArrayHasKey('value', $removed);
            $this->assertArrayHasKey('scope', $removed);
            $this->assertArrayHasKey('scenario', $removed);
        }
    }

    public function testDiffRemovedReturnsEveryPreviousWhenCurrentEmpty(): void
    {
        $a = self::makeDecision(1, '1.1.1.1');
        $b = self::makeDecision(2, '2.2.2.2');
        $this->assertCount(2, self::invoke('diffRemoved', [[$a, $b], []]));
    }

    public function testDiffRemovedIgnoresEntriesMissingAnId(): void
    {
        $valid   = self::makeDecision(1, '1.1.1.1');
        $invalid = ['value' => '2.2.2.2']; // no `id` key
        $current = [self::makeDecision(99, '9.9.9.9')];

        // Both `valid` and `invalid` are "missing" from current, but only
        // entries with `id` participate in the diff.
        $result = self::invoke('diffRemoved', [[$valid, $invalid], $current]);
        $this->assertCount(1, $result);
        $this->assertSame(1, $result[0]['id']);
    }

    /**
     * @return array<string, mixed>
     */
    private static function makeDecision(int $id, string $ip): array
    {
        return [
            'id'       => $id,
            'origin'   => 'mikopbx-fail2ban',
            'type'     => 'ban',
            'scope'    => 'Ip',
            'value'    => $ip,
            'duration' => '3600s',
            'scenario' => 'mikopbx/http',
        ];
    }
}

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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Providers;

use MikoPBX\PBXCoreREST\Lib\Providers\AbstractProviderStatusAction;
use MikoPBX\PBXCoreREST\Lib\Providers\GetAllStatusesAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Unit tests for the pure provider-status logic behind issue #1085.
 *
 * Covers the three regressions the issue exposed, without touching Redis/AMI:
 *   - normalizeSipState() must NOT collapse transient registration statuses to
 *     'unregistered' (that produced spurious red "registration lost" events).
 *   - getStateColor() must agree with the frontend timeline map (unregistered/
 *     rejected = red, off = grey).
 *   - detectStatusChanges() must seed silently from an empty cache and never emit
 *     a history event that involves UNKNOWN on either side.
 *   - isContactUnreachable() classifies qualify/OPTIONS reachability for the
 *     "registered but unreachable" degradation.
 *
 * All methods under test are pure (no DI / Redis / AMI) and reached via Reflection.
 */
final class ProviderStateLogicTest extends TestCase
{
    private static function invokeAbstract(string $method, array $args): mixed
    {
        $ref = new ReflectionMethod(AbstractProviderStatusAction::class, $method);
        $ref->setAccessible(true);
        return $ref->invoke(null, ...$args);
    }

    private static function invokeGetAll(string $method, array $args): mixed
    {
        $ref = new ReflectionMethod(GetAllStatusesAction::class, $method);
        $ref->setAccessible(true);
        return $ref->invoke(null, ...$args);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  normalizeSipState — P0b: transient statuses must become UNKNOWN, not a fault
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dataProvider sipStateCases
     */
    public function testNormalizeSipState(string $input, string $expected): void
    {
        $this->assertSame($expected, self::invokeAbstract('normalizeSipState', [$input]));
    }

    public static function sipStateCases(): array
    {
        return [
            'Registered'        => ['Registered', 'registered'],
            'REGISTERED upper'  => ['REGISTERED', 'registered'],
            'Unregistered'      => ['Unregistered', 'unregistered'],
            'Rejected'          => ['Rejected', 'rejected'],
            'OK'                => ['OK', 'OK'],
            // The bug: anything transient/unknown must NOT be 'unregistered'.
            'Registering'       => ['Registering', 'UNKNOWN'],
            'Reregistering'     => ['Reregistering', 'UNKNOWN'],
            'Stopped'           => ['Stopped', 'UNKNOWN'],
            'None'              => ['None', 'UNKNOWN'],
            'empty string'      => ['', 'UNKNOWN'],
            'garbage'           => ['Whatever', 'UNKNOWN'],
            'explicit UNKNOWN'  => ['UNKNOWN', 'UNKNOWN'],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  getStateColor — P1b: must match the frontend timeline colour map
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dataProvider stateColorCases
     */
    public function testGetStateColor(string $state, ?int $rtt, string $expected): void
    {
        $this->assertSame($expected, self::invokeAbstract('getStateColor', [$state, $rtt]));
    }

    public static function stateColorCases(): array
    {
        return [
            'registered low rtt'   => ['registered', 20, 'green'],
            'registered null rtt'  => ['registered', null, 'green'],
            'registered high rtt'  => ['registered', 150, 'yellow'],
            'ok'                   => ['OK', null, 'green'],
            'unregistered is red'  => ['unregistered', null, 'red'],
            'rejected is red'      => ['rejected', null, 'red'],
            'off is grey'          => ['off', null, 'grey'],
            'unreachable yellow'   => ['unreachable', null, 'yellow'],
            'lagged yellow'        => ['lagged', null, 'yellow'],
            'unknown grey'         => ['UNKNOWN', null, 'grey'],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  isContactUnreachable — P4: qualify/OPTIONS reachability verdict
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dataProvider contactStatusCases
     */
    public function testIsContactUnreachable(string $status, bool $expected): void
    {
        $this->assertSame($expected, self::invokeAbstract('isContactUnreachable', [$status]));
    }

    public static function contactStatusCases(): array
    {
        return [
            'Unreachable'  => ['Unreachable', true],
            'Unavail'      => ['Unavail', true],
            'Unavailable'  => ['Unavailable', true],
            'Reachable'    => ['Reachable', false],
            'Avail'        => ['Avail', false],
            // NonQualified / Unknown mean "not monitored", NOT a failure.
            'NonQualified' => ['NonQualified', false],
            'NonQual'      => ['NonQual', false],
            'Unknown'      => ['Unknown', false],
            'empty'        => ['', false],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  detectStatusChanges — P0a/P0c + P1a
    // ─────────────────────────────────────────────────────────────────────────

    public function testEmptyCacheSeedsSilently(): void
    {
        // First run after a worker/Redis restart: no previous statuses at all.
        // Must NOT emit any history event (the #1085 spurious "registration lost").
        $last = ['sip' => [], 'iax' => []];
        $current = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertSame([], $changes, 'Initial seed from empty cache must produce no events');
    }

    public function testRealRegistrationLossIsRecorded(): void
    {
        $last = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];
        $current = ['sip' => ['PRV1' => self::status('unregistered')], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertCount(1, $changes);
        $this->assertSame('registered', $changes[0]['old_state']);
        $this->assertSame('unregistered', $changes[0]['new_state']);
        // P1a: the resolved colour travels with the change for the timeline.
        $this->assertArrayHasKey('state_color', $changes[0]);
        $this->assertSame('red', $changes[0]['state_color']);
    }

    public function testTransitionToUnknownIsNotRecorded(): void
    {
        // Indeterminate read (e.g. AMI hiccup) must not be logged as an incident.
        $last = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];
        $current = ['sip' => ['PRV1' => self::status('UNKNOWN', 'grey')], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertSame([], $changes);
    }

    public function testTransitionFromUnknownIsNotRecorded(): void
    {
        // Recovering from a seed/transient UNKNOWN to registered is not an event.
        $last = ['sip' => ['PRV1' => self::status('UNKNOWN', 'grey')], 'iax' => []];
        $current = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertSame([], $changes);
    }

    public function testNoChangeWhenStateStable(): void
    {
        $last = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];
        $current = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertSame([], $changes);
    }

    public function testRemovedProviderStillRecorded(): void
    {
        // The REMOVED pass is separate from the UNKNOWN guard: a provider that
        // disappears from the current set must still produce a REMOVED event.
        $last = ['sip' => ['PRV1' => self::status('registered')], 'iax' => []];
        $current = ['sip' => [], 'iax' => []];

        $changes = self::invokeGetAll('detectStatusChanges', [$last, $current]);
        $this->assertCount(1, $changes);
        $this->assertSame('PRV1', $changes[0]['provider_id']);
        $this->assertSame('registered', $changes[0]['old_state']);
        $this->assertSame('REMOVED', $changes[0]['new_state']);
    }

    /**
     * Minimal status shape consumed by detectStatusChanges().
     */
    private static function status(string $state, string $color = 'red'): array
    {
        return [
            'state' => $state,
            'stateColor' => $state === 'registered' ? 'green' : $color,
            'username' => 'user1',
            'host' => 'sip.example.com',
        ];
    }
}

<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators\ResParkingConfFixture;
use PHPUnit\Framework\TestCase;

/**
 * Snapshot of the generated res_parking.conf.
 *
 * parkingtime must always be written from the same PBXCallParkingDuration value that feeds the
 * PARKING_DURATION dialplan global: Asterisk holds a parked call for parkingtime, while
 * extensions.lua computes the CDR start of a timed-out parked call as now - PARKING_DURATION (#1400).
 */
final class ResParkingConfTest extends TestCase
{
    public function testGeneratedConfigMatchesSnapshotWithDefaultParkingDuration(): void
    {
        $conf = new ResParkingConfFixture();

        $expected = <<<'CONF'
[general]
parkeddynamic = yes

[default]
context => parked-calls
parkedcallreparking = caller
parkedcalltransfers = caller
parkext => 800
findslot => next
comebacktoorigin=no
comebackcontext = parked-calls-timeout
parkpos => 801-820
parkingtime => 50

CONF;

        // PHP always strips the newline before the closing marker, so the generator's
        // trailing blank line (PHP_EOL . PHP_EOL) needs the explicit PHP_EOL.
        self::assertSame($expected . PHP_EOL, $conf->captureConfig());
    }

    public function testParkingTimeFollowsTheConfiguredDuration(): void
    {
        $conf = new ResParkingConfFixture(parkingDuration: '45');

        self::assertStringContainsString('parkingtime => 45', $conf->captureConfig());
        self::assertSame('PARKING_DURATION=45' . PHP_EOL, $conf->extensionGlobals());
    }
}

<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Upgrade;

use DateTimeImmutable;
use DateTimeZone;
use MikoPBX\Core\System\Upgrade\Releases\UpdateConfigsUpToVer20261012;
use PHPUnit\Framework\TestCase;

/**
 * Migration of off-work time dates from timestamps to 'Y-m-d' days of the PBX timezone.
 */
final class UpdateConfigsUpToVer20261012Test extends TestCase
{
    private const string PBX_ZONE = 'Europe/Moscow';

    /**
     * What the old form stored: 00:00:00 / 23:59:59 of the browser timezone.
     */
    private static function formValue(string $date, bool $isEnd, string $browserZone): string
    {
        $time = $isEnd ? '23:59:59' : '00:00:00';
        return (string)(new DateTimeImmutable("$date $time", new DateTimeZone($browserZone)))->getTimestamp();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function browserZones(): array
    {
        return [
            'same zone' => ['Europe/Moscow'],
            'west, UTC+2' => ['Europe/Kaliningrad'],
            'west, UTC' => ['UTC'],
            'west, UTC-5' => ['America/New_York'],
            'east, UTC+5' => ['Asia/Yekaterinburg'],
            'east, UTC+5:30' => ['Asia/Kolkata'],
            'east, UTC+5:45' => ['Asia/Kathmandu'],
            'east, UTC+10' => ['Asia/Vladivostok'],
        ];
    }

    /**
     * @dataProvider browserZones
     */
    public function testRestoresDatesPickedInAnyBrowserTimezone(string $browserZone): void
    {
        $pbx = new DateTimeZone(self::PBX_ZONE);
        foreach (['2026-12-10', '2026-12-31', '2027-01-01', '2026-03-01'] as $date) {
            self::assertSame(
                $date,
                UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, false, $browserZone), false, $pbx),
                "date_from $date from $browserZone"
            );
            self::assertSame(
                $date,
                UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, true, $browserZone), true, $pbx),
                "date_to $date from $browserZone"
            );
        }
    }

    /**
     * Browser and PBX more than 12 hours apart, beyond a "nearest midnight" rounding.
     *
     * @return array<string, array{string, string}>
     */
    public static function distantZones(): array
    {
        return [
            'browser 15 h west' => ['Asia/Novosibirsk', 'America/Los_Angeles'],
            'browser 23 h west' => ['Pacific/Auckland', 'Pacific/Honolulu'],
            'browser 18 h east' => ['America/New_York', 'Pacific/Auckland'],
            'browser 13 h east' => ['America/Chicago', 'Pacific/Auckland'],
            'browser 25 h east' => ['Pacific/Pago_Pago', 'Pacific/Tongatapu'],
            'browser 12 h west, UTC-10' => ['Asia/Kamchatka', 'Pacific/Honolulu'],
        ];
    }

    /**
     * @dataProvider distantZones
     */
    public function testRestoresDatesForDistantTimezones(string $pbxZone, string $browserZone): void
    {
        $pbx = new DateTimeZone($pbxZone);
        foreach (['2026-01-10', '2026-07-01', '2026-12-31'] as $date) {
            self::assertSame(
                $date,
                UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, false, $browserZone), false, $pbx),
                "date_from $date from $browserZone, PBX $pbxZone"
            );
            self::assertSame(
                $date,
                UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, true, $browserZone), true, $pbx),
                "date_to $date from $browserZone, PBX $pbxZone"
            );
        }
    }

    public function testAmbiguousUtcPlus14IsReadAsUtcMinus10(): void
    {
        // Kiritimati (+14) and Honolulu (-10) produce the same timestamps; Hawaii is taken
        $pbx = new DateTimeZone('America/New_York');
        $fromKiritimati = self::formValue('2026-01-10', false, 'Pacific/Kiritimati');
        $fromHonolulu = self::formValue('2026-01-10', false, 'Pacific/Honolulu');
        self::assertSame('2026-01-09', UpdateConfigsUpToVer20261012::convertDate($fromKiritimati, false, $pbx));
        self::assertSame('2026-01-10', UpdateConfigsUpToVer20261012::convertDate($fromHonolulu, false, $pbx));
    }

    public function testRestoresDatesForPbxWithDaylightSaving(): void
    {
        $pbx = new DateTimeZone('America/New_York');
        // Both days touch a clock change in New York
        foreach (['2026-03-08', '2026-11-01'] as $date) {
            foreach (['Europe/Moscow', 'America/Los_Angeles', 'UTC'] as $browserZone) {
                self::assertSame(
                    $date,
                    UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, false, $browserZone), false, $pbx),
                    "date_from $date from $browserZone"
                );
                self::assertSame(
                    $date,
                    UpdateConfigsUpToVer20261012::convertDate(self::formValue($date, true, $browserZone), true, $pbx),
                    "date_to $date from $browserZone"
                );
            }
        }
    }

    public function testEndDateLeftAtMidnightByMigration20250115(): void
    {
        // 2025.1.15 stored 'Y-m-d' strings as strtotime() midnight, also in date_to
        $pbx = new DateTimeZone(self::PBX_ZONE);
        $midnightUtc = (string)gmmktime(0, 0, 0, 12, 12, 2026);
        self::assertSame('2026-12-12', UpdateConfigsUpToVer20261012::convertDate($midnightUtc, true, $pbx));
        self::assertSame('2026-12-12', UpdateConfigsUpToVer20261012::convertDate($midnightUtc, false, $pbx));
    }

    public function testArbitraryTimestampKeepsItsDayInPbxTimezone(): void
    {
        $pbx = new DateTimeZone(self::PBX_ZONE);
        // 2026-12-10 14:37:12 Moscow, not a value the form produced
        $timestamp = (string)gmmktime(11, 37, 12, 12, 10, 2026);
        self::assertSame('2026-12-10', UpdateConfigsUpToVer20261012::convertDate($timestamp, false, $pbx));
        self::assertSame('2026-12-10', UpdateConfigsUpToVer20261012::convertDate($timestamp, true, $pbx));
    }

    public function testKeepsEmptyAndYmdAndIsIdempotent(): void
    {
        $pbx = new DateTimeZone(self::PBX_ZONE);
        self::assertSame('', UpdateConfigsUpToVer20261012::convertDate('', false, $pbx));
        self::assertSame('2026-12-10', UpdateConfigsUpToVer20261012::convertDate('2026-12-10', true, $pbx));

        $converted = UpdateConfigsUpToVer20261012::convertDate(self::formValue('2026-12-10', true, 'UTC'), true, $pbx);
        self::assertSame($converted, UpdateConfigsUpToVer20261012::convertDate((string)$converted, true, $pbx));
    }

    public function testLegacyStrings(): void
    {
        $pbx = new DateTimeZone(self::PBX_ZONE);
        self::assertSame('2026-12-10', UpdateConfigsUpToVer20261012::convertDate('10 December 2026', false, $pbx));
        self::assertNull(UpdateConfigsUpToVer20261012::convertDate('not a date', false, $pbx));
    }
}

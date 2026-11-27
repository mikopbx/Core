<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Library;

use DateTimeZone;
use MikoPBX\Common\Library\OutWorkTimeDate;
use PHPUnit\Framework\TestCase;

/**
 * Off-work time dates are calendar days of the PBX timezone stored as 'Y-m-d'.
 */
final class OutWorkTimeDateTest extends TestCase
{
    public function testIsDateAcceptsOnlyRealYmdDates(): void
    {
        self::assertTrue(OutWorkTimeDate::isDate('2026-12-10'));
        self::assertTrue(OutWorkTimeDate::isDate('2028-02-29'));
        self::assertFalse(OutWorkTimeDate::isDate('2026-02-30'));
        self::assertFalse(OutWorkTimeDate::isDate('2026/12/10'));
        self::assertFalse(OutWorkTimeDate::isDate('2026-12-10 00:00:00'));
        self::assertFalse(OutWorkTimeDate::isDate('1765314000'));
        self::assertFalse(OutWorkTimeDate::isDate(''));
    }

    public function testNormalizeKeepsEmptyAndYmd(): void
    {
        $moscow = new DateTimeZone('Europe/Moscow');
        self::assertSame('', OutWorkTimeDate::normalize('', $moscow));
        self::assertSame('2026-12-10', OutWorkTimeDate::normalize(' 2026-12-10 ', $moscow));
    }

    public function testNormalizeTurnsArbitraryTimestampIntoDayOfPbxTimezone(): void
    {
        // 2026-12-09 22:17:41 UTC is already 2026-12-10 01:17 in Moscow
        $timestamp = (string)gmmktime(22, 17, 41, 12, 9, 2026);
        self::assertSame('2026-12-10', OutWorkTimeDate::normalize($timestamp, new DateTimeZone('Europe/Moscow')));
        self::assertSame('2026-12-09', OutWorkTimeDate::normalize($timestamp, new DateTimeZone('UTC')));
    }

    public function testNormalizeRestoresDayEnteredInBrowserOfAnotherTimezone(): void
    {
        // The former form from a browser in UTC: 10.12 00:00:00 .. 12.12 23:59:59 UTC
        $moscow = new DateTimeZone('Europe/Moscow');
        self::assertSame('2026-12-10', OutWorkTimeDate::normalize((string)gmmktime(0, 0, 0, 12, 10, 2026), $moscow));
        self::assertSame(
            '2026-12-12',
            OutWorkTimeDate::normalize((string)gmmktime(23, 59, 59, 12, 12, 2026), $moscow, true)
        );
    }

    public function testNormalizeRejectsOtherFormats(): void
    {
        $utc = new DateTimeZone('UTC');
        self::assertNull(OutWorkTimeDate::normalize('2025/01/01', $utc));
        self::assertNull(OutWorkTimeDate::normalize('1 January', $utc));
        self::assertNull(OutWorkTimeDate::normalize('-100', $utc));
    }

    public function testDayBoundsAreInGivenTimezone(): void
    {
        $moscow = new DateTimeZone('Europe/Moscow');
        $start = OutWorkTimeDate::dayStart('2026-12-10', $moscow);
        $end = OutWorkTimeDate::dayEnd('2026-12-10', $moscow);

        self::assertNotNull($start);
        self::assertNotNull($end);
        self::assertSame(gmmktime(21, 0, 0, 12, 9, 2026), $start->getTimestamp());
        self::assertSame(gmmktime(20, 59, 59, 12, 10, 2026), $end->getTimestamp());
        self::assertNull(OutWorkTimeDate::dayStart('', $moscow));
        self::assertNull(OutWorkTimeDate::dayEnd('1765314000', $moscow));
    }

    public function testDayStartOnDaylightSavingDay(): void
    {
        // Clocks go forward at 02:00 on 2026-03-08 in New York; midnight still exists
        $start = OutWorkTimeDate::dayStart('2026-03-08', new DateTimeZone('America/New_York'));
        self::assertNotNull($start);
        self::assertSame('2026-03-08 00:00:00 -05:00', $start->format('Y-m-d H:i:s P'));
    }

    public function testFormat(): void
    {
        self::assertSame('10.12.2026', OutWorkTimeDate::format('2026-12-10', 'd.m.Y'));
        self::assertSame('garbage', OutWorkTimeDate::format('garbage', 'd.m.Y'));
    }
}

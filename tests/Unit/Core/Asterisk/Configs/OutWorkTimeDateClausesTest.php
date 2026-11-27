<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use DateTimeZone;
use MikoPBX\Core\Asterisk\Configs\ExtensionsOutWorkTimeConf;
use PHPUnit\Framework\TestCase;

/**
 * Date part of the off-work GotoIfTime() rules built from 'Y-m-d' dates.
 */
final class OutWorkTimeDateClausesTest extends TestCase
{
    private DateTimeZone $moscow;

    protected function setUp(): void
    {
        $this->moscow = new DateTimeZone('Europe/Moscow');
    }

    public function testRangeWithinMonth(): void
    {
        self::assertSame(
            [['year' => '2026', 'mDays' => '10-12', 'months' => 'dec-dec']],
            ExtensionsOutWorkTimeConf::getDateClauses('2026-12-10', '2026-12-12', $this->moscow)
        );
    }

    public function testSingleDayIsLimitedToItsYear(): void
    {
        // Same start and end used to produce no interval and a rule repeated every year
        self::assertSame(
            [['year' => '2026', 'mDays' => '31-31', 'months' => 'dec-dec']],
            ExtensionsOutWorkTimeConf::getDateClauses('2026-12-31', '2026-12-31', $this->moscow)
        );
    }

    public function testRangeAcrossMonthsAndYears(): void
    {
        self::assertSame(
            [
                ['year' => '2026', 'mDays' => '30-31', 'months' => 'dec-dec'],
                ['year' => '2027', 'mDays' => '1-31', 'months' => 'jan-jan'],
                ['year' => '2027', 'mDays' => '1-2', 'months' => 'feb-feb'],
            ],
            ExtensionsOutWorkTimeConf::getDateClauses('2026-12-30', '2027-02-02', $this->moscow)
        );
    }

    public function testDatesDoNotDependOnTimezone(): void
    {
        $expected = ExtensionsOutWorkTimeConf::getDateClauses('2026-12-10', '2026-12-12', $this->moscow);
        foreach (['UTC', 'Asia/Yekaterinburg', 'America/New_York', 'Asia/Kolkata'] as $zone) {
            self::assertSame(
                $expected,
                ExtensionsOutWorkTimeConf::getDateClauses('2026-12-10', '2026-12-12', new DateTimeZone($zone)),
                $zone
            );
        }
    }

    public function testNoDatesMatchesAnyDay(): void
    {
        self::assertSame(
            [['year' => '', 'mDays' => '*', 'months' => '*']],
            ExtensionsOutWorkTimeConf::getDateClauses('', '', $this->moscow)
        );
    }

    public function testStartWithoutEndRepeatsEveryYear(): void
    {
        self::assertSame(
            [['year' => '', 'mDays' => '9', 'months' => 'may']],
            ExtensionsOutWorkTimeConf::getDateClauses('2026-05-09', '', $this->moscow)
        );
    }

    public function testUnreadableDateIsReportedNotTurnedIntoEveryDay(): void
    {
        self::assertNull(ExtensionsOutWorkTimeConf::getDateClauses('10 January', '2026-01-12', $this->moscow));
        self::assertNull(ExtensionsOutWorkTimeConf::getDateClauses('2026-01-10', 'garbage', $this->moscow));
    }

    public function testTimestampOfFormerFormatIsReadAsEnteredDay(): void
    {
        // A rule saved by the former form from a browser in UTC and not migrated
        $from = (string)gmmktime(0, 0, 0, 1, 10, 2026);
        $to = (string)gmmktime(23, 59, 59, 1, 12, 2026);
        self::assertSame(
            [['year' => '2026', 'mDays' => '10-12', 'months' => 'jan-jan']],
            ExtensionsOutWorkTimeConf::getDateClauses($from, $to, $this->moscow)
        );
    }

    public function testReversedRangeProducesNoRule(): void
    {
        self::assertSame([], ExtensionsOutWorkTimeConf::getDateClauses('2026-12-12', '2026-12-10', $this->moscow));
    }
}

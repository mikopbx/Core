<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Cdr;

use InvalidArgumentException;
use MikoPBX\PBXCoreREST\Lib\Cdr\CdrDateRange;
use PDO;
use PHPUnit\Framework\TestCase;

/**
 * CDR period bounds compared with cdr_general.start strings.
 */
final class CdrDateRangeTest extends TestCase
{
    public function testDateCoversWholeDay(): void
    {
        self::assertSame('2026-11-27 00:00:00', CdrDateRange::toSql(CdrDateRange::start('2026-11-27')));
        self::assertSame('2026-11-28 00:00:00', CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27')));
    }

    public function testTimeCoversWholeSecond(): void
    {
        self::assertSame('2026-11-27 10:15:00', CdrDateRange::toSql(CdrDateRange::start('2026-11-27 10:15:00')));
        self::assertSame('2026-11-27 10:15:01', CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27 10:15:00')));
        self::assertSame('2026-11-28 00:00:00', CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27T23:59:59')));
    }

    public function testMillisecondsAreKept(): void
    {
        self::assertSame(
            '2026-11-27 10:15:00.250',
            CdrDateRange::toSql(CdrDateRange::start('2026-11-27 10:15:00.250'))
        );
        self::assertSame(
            '2026-11-27 10:15:00.251',
            CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27T10:15:00.250'))
        );
    }

    /**
     * @return array<string, array{string}>
     */
    public static function invalidValues(): array
    {
        return [
            'slashes' => ['2026/11/27'],
            'utc suffix' => ['2026-11-27T10:00:00Z'],
            'offset' => ['2026-11-27T10:00:00+03:00'],
            'no seconds' => ['2026-11-27 10:00'],
            'no such day' => ['2026-02-30'],
            'no such hour' => ['2026-11-27 24:00:00'],
            'timestamp' => ['1764230400'],
            'empty' => [''],
        ];
    }

    /**
     * @dataProvider invalidValues
     */
    public function testRejectsOtherFormats(string $value): void
    {
        $this->expectException(InvalidArgumentException::class);
        CdrDateRange::start($value);
    }

    public function testDaysOfRange(): void
    {
        self::assertSame(
            0,
            CdrDateRange::days(CdrDateRange::start('2026-11-27'), CdrDateRange::endExclusive('2026-11-27'))
        );
        self::assertSame(
            365,
            CdrDateRange::days(CdrDateRange::start('2025-01-01'), CdrDateRange::endExclusive('2026-01-01'))
        );
        self::assertSame(
            366,
            CdrDateRange::days(CdrDateRange::start('2025-01-01'), CdrDateRange::endExclusive('2026-01-02'))
        );
    }

    public function testDaylightSavingDayOfPhpTimezoneDoesNotShiftHours(): void
    {
        // 2026-03-29 02:30 does not exist in Berlin; the bounds are wall-clock values regardless
        date_default_timezone_set('Europe/Berlin');
        self::assertSame('2026-03-29 02:30:00', CdrDateRange::toSql(CdrDateRange::start('2026-03-29 02:30:00')));
        self::assertSame('2026-03-30 00:00:00', CdrDateRange::toSql(CdrDateRange::endExclusive('2026-03-29')));
    }

    public function testBoundsSelectRecordsAsSqliteComparesThem(): void
    {
        $db = new PDO('sqlite::memory:');
        $db->exec('CREATE TABLE cdr_general (id INTEGER PRIMARY KEY, start TEXT)');
        $rows = [
            1 => '2026-11-26 23:59:59.999', // day before
            2 => '2026-11-27 00:00:00',     // midnight, no milliseconds
            3 => '2026-11-27 00:00:00.000',
            4 => '2026-11-27 13:10:35.977',
            5 => '2026-11-27 23:59:59',
            6 => '2026-11-27 23:59:59.977', // lost by the former "<= 23:59:59"
            7 => '2026-11-28 00:00:00',     // day after
            8 => '2026-11-28 00:00:00.000',
        ];
        $insert = $db->prepare('INSERT INTO cdr_general (id, start) VALUES (?, ?)');
        foreach ($rows as $id => $start) {
            $insert->execute([$id, $start]);
        }
        $select = $db->prepare('SELECT id FROM cdr_general WHERE start >= ? AND start < ? ORDER BY id');

        $select->execute([
            CdrDateRange::toSql(CdrDateRange::start('2026-11-27')),
            CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27')),
        ]);
        self::assertSame([2, 3, 4, 5, 6], array_map('intval', $select->fetchAll(PDO::FETCH_COLUMN)));

        $select->execute([
            CdrDateRange::toSql(CdrDateRange::start('2026-11-27 13:10:35')),
            CdrDateRange::toSql(CdrDateRange::endExclusive('2026-11-27 13:10:35')),
        ]);
        self::assertSame([4], array_map('intval', $select->fetchAll(PDO::FETCH_COLUMN)));
    }
}

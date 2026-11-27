<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\TimeSettings;

use MikoPBX\PBXCoreREST\Lib\TimeSettings\UpdateSettingsAction;
use PHPUnit\Framework\TestCase;

/**
 * The manually entered time is read in the timezone saved with it, not in the PHP default one.
 */
final class ManualDateTimeTest extends TestCase
{
    public function testFormValueIsReadInGivenTimezone(): void
    {
        self::assertSame(
            gmmktime(9, 0, 0, 12, 10, 2026),
            UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10 12:00:00', 'Europe/Moscow')
        );
        self::assertSame(
            gmmktime(5, 0, 0, 12, 10, 2026),
            UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10 12:00:00', 'Asia/Novosibirsk')
        );
    }

    public function testPhpDefaultTimezoneDoesNotMatter(): void
    {
        // The request that changes the timezone still runs with the previous default
        date_default_timezone_set('Europe/Moscow');
        self::assertSame(
            gmmktime(5, 0, 0, 12, 10, 2026),
            UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10 12:00:00', 'Asia/Novosibirsk')
        );
    }

    public function testIsoValueWithOffsetKeepsItsOffset(): void
    {
        self::assertSame(
            gmmktime(10, 0, 0, 12, 10, 2026),
            UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10T12:00:00+02:00', 'Europe/Moscow')
        );
    }

    public function testIsoValueWithoutOffsetIsReadInGivenTimezone(): void
    {
        self::assertSame(
            gmmktime(9, 30, 0, 12, 10, 2026),
            UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10T12:30', 'Europe/Moscow')
        );
    }

    public function testInvalidValueIsRejected(): void
    {
        $this->expectException(\Exception::class);
        UpdateSettingsAction::manualDateTimeToTimestamp('not a date', 'Europe/Moscow');
    }

    public function testInvalidTimezoneIsRejected(): void
    {
        $this->expectException(\Exception::class);
        UpdateSettingsAction::manualDateTimeToTimestamp('2026-12-10 12:00:00', 'Mars/Olympus');
    }
}

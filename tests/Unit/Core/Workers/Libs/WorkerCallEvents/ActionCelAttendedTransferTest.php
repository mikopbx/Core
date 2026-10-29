<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAttendedTransfer;
use PHPUnit\Framework\TestCase;

final class ActionCelAttendedTransferTest extends TestCase
{
    public function testLateSecondPrecisionTransferDoesNotEndBeforeTheAnswer(): void
    {
        // Answered at .500 and transferred within that second; CEL reports the transfer at :00.
        self::assertSame(
            '2026-10-29 12:00:00.500',
            ActionCelAttendedTransfer::endTimeFor('2026-10-29 12:00:00', '2026-10-29 12:00:00.500')
        );
    }

    public function testTransferAfterTheAnswerKeepsItsTime(): void
    {
        self::assertSame(
            '2026-10-29 12:00:07',
            ActionCelAttendedTransfer::endTimeFor('2026-10-29 12:00:07', '2026-10-29 12:00:00.500')
        );
        self::assertSame(
            '2026-10-29 12:00:07.120',
            ActionCelAttendedTransfer::endTimeFor('2026-10-29 12:00:07.120', '')
        );
    }
}

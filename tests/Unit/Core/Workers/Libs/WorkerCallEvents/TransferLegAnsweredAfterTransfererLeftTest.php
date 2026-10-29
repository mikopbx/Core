<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\TransferLegAnsweredAfterTransfererLeft;
use PHPUnit\Framework\TestCase;

final class TransferLegAnsweredAfterTransfererLeftTest extends TestCase
{
    public function testLegClosedByTheTransfererLeavingEarlier(): void
    {
        // B hung up at :48 while the destination rang; the destination hangs up at :56.
        self::assertTrue(TransferLegAnsweredAfterTransfererLeft::isLeftByTransferer(
            '2026-10-29 13:24:48.056',
            '2026-10-29 13:24:56.940',
            false
        ));
    }

    public function testDestinationHangingUpDuringTheConsultationIsNoTransfer(): void
    {
        // B consults C; C answers and hangs up while B is still on the line: its own hangup
        // closed the leg, at the very time of this hangup.
        self::assertFalse(TransferLegAnsweredAfterTransfererLeft::isLeftByTransferer(
            '2026-10-29 13:24:56.940',
            '2026-10-29 13:24:56.940',
            true
        ));
        self::assertFalse(TransferLegAnsweredAfterTransfererLeft::isLeftByTransferer(
            '2026-10-29 13:24:56.940',
            '2026-10-29 13:24:56.940',
            false
        ));
        self::assertFalse(TransferLegAnsweredAfterTransfererLeft::isLeftByTransferer(
            '2026-10-29 13:24:48.056',
            '2026-10-29 13:24:56.940',
            true
        ));
    }
}

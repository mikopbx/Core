<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\PickupTransferLegPolicy;
use PHPUnit\Framework\TestCase;

final class PickupTransferLegPolicyTest extends TestCase
{
    public function testKeepsStolenRingingTransferLegOpenWhenPickupHangupArrivesFromAnotherCallGroup(): void
    {
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-0000020c',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '[C-00000131]',
        ];

        // The *8 pickup tore down 233-0000020c from the picker's own call group.
        self::assertTrue(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-0000020c', '[C-00000133]')
        );
    }

    public function testKeepsStolenLegOpenWhenPickupHangupHasEmptyCallGroup(): void
    {
        // Observed on a live boffart call: the stolen leg's hangup lost its call
        // group entirely (empty verbose_call_id), still a mismatch against the row.
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/201-00000001',
            'dst_chan' => 'PJSIP/203-00000002',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '[C-00000001]',
        ];

        self::assertTrue(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/203-00000002', '')
        );
    }

    public function testDoesNotKeepPlainNoAnswerLegOpenWhenHangupStaysInSameCallGroup(): void
    {
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-WS-0000020d',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '[C-00000131]',
        ];

        self::assertFalse(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-WS-0000020d', '[C-00000131]')
        );
    }

    public function testDoesNotKeepAnsweredLegOpen(): void
    {
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-0000020c',
            'answer' => '2026-09-30 15:29:03.534',
            'endtime' => '',
            'verbose_call_id' => '[C-00000131]',
        ];

        self::assertFalse(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-0000020c', '[C-00000133]')
        );
    }

    public function testDoesNotKeepNonTransferLegOpen(): void
    {
        $row = (object)[
            'transfer' => '0',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-0000020c',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '[C-00000131]',
        ];

        self::assertFalse(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-0000020c', '[C-00000133]')
        );
    }

    public function testDoesNotMatchWhenHangupIsForAnotherChannel(): void
    {
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-0000020c',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '[C-00000131]',
        ];

        self::assertFalse(
            PickupTransferLegPolicy::keepOpen($row, 'PJSIP/223-0000020b', '[C-00000133]')
        );
    }

    public function testDoesNotMatchWhenRowHasNoCallGroup(): void
    {
        // Without a call group on the row there is nothing to compare against, so the
        // pickup cannot be told apart from a plain teardown — do not keep it open.
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/223-0000020b',
            'dst_chan' => 'PJSIP/233-0000020c',
            'answer' => '',
            'endtime' => '',
            'verbose_call_id' => '',
        ];

        self::assertFalse(PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-0000020c', '[C-00000133]'));
        self::assertFalse(PickupTransferLegPolicy::keepOpen($row, 'PJSIP/233-0000020c', ''));
    }
}

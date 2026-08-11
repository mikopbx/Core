<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\AnsweredTransferLegPolicy;
use PHPUnit\Framework\TestCase;

final class AnsweredTransferLegPolicyTest extends TestCase
{
    public function testKeepsAnsweredDestinationLegOpenWhenTransfererHangsUp(): void
    {
        $row = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/577-00002fcc',
            'dst_chan' => 'PJSIP/637-00003030',
            'answer' => '2026-08-06 14:27:37.850',
            'endtime' => '',
        ];

        self::assertTrue(AnsweredTransferLegPolicy::keepOpen($row, 'PJSIP/577-00002fcc'));
    }

    public function testDoesNotKeepRingingOrReverseLegOpen(): void
    {
        $ringing = (object)[
            'transfer' => '1',
            'src_chan' => 'PJSIP/577-00002fcc',
            'dst_chan' => 'PJSIP/637-00003030',
            'answer' => '',
            'endtime' => '',
        ];
        $original = clone $ringing;
        $original->src_chan = 'PJSIP/provider-00002fbb';
        $original->dst_chan = 'PJSIP/577-00002fcc';
        $original->answer = '2026-08-06 14:26:21.607';

        self::assertFalse(AnsweredTransferLegPolicy::keepOpen($ringing, 'PJSIP/577-00002fcc'));
        self::assertFalse(AnsweredTransferLegPolicy::keepOpen($original, 'PJSIP/577-00002fcc'));
    }
}

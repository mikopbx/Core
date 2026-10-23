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

    public function testCompletedAttendedTransferYieldsConversationAndConsultationPair(): void
    {
        $transferer = 'PJSIP/206-00000081';
        $conversation = $this->row('PJSIP/provider-0000007c', $transferer, '2026-10-22 14:17:25.557');
        $consultation = $this->row($transferer, 'PJSIP/259-00000088', '2026-10-22 14:17:43.457');

        self::assertSame(
            [$conversation, $consultation],
            AnsweredTransferLegPolicy::completedTransferPair([$conversation, $consultation], $transferer)
        );
    }

    public function testCompletedTransferPairIgnoresRingingAndForeignRows(): void
    {
        $transferer = 'PJSIP/206-00000081';
        $conversation = $this->row('PJSIP/provider-0000007c', $transferer, '2026-10-22 14:17:25.557');
        $consultation = $this->row($transferer, 'PJSIP/259-00000088', '2026-10-22 14:17:43.457');
        $ringing = $this->row($transferer, 'PJSIP/259-00000089', '');
        $foreign = $this->row('PJSIP/provider-0000007c', 'PJSIP/212-00000090', '2026-10-22 14:17:30.000');

        self::assertSame(
            [$conversation, $consultation],
            AnsweredTransferLegPolicy::completedTransferPair(
                [$conversation, $ringing, $foreign, $consultation],
                $transferer
            )
        );
    }

    public function testCompletedTransferPairFallsBackOnAmbiguousTransfers(): void
    {
        $transferer = 'PJSIP/577-00002fcc';
        $conversation = $this->row('PJSIP/provider-00002fbb', $transferer, '2026-08-06 14:26:21.607');
        $consultation = $this->row($transferer, 'PJSIP/637-00003030', '2026-08-06 14:27:37.850');
        $queue = $this->row($transferer, 'Queue:3002', '2026-08-06 14:27:37.900');
        $secondLeg = $this->row($transferer, 'PJSIP/638-00003031', '2026-08-06 14:27:38.000');

        self::assertNull(AnsweredTransferLegPolicy::completedTransferPair(
            [$conversation, $consultation, $queue],
            $transferer
        ));
        self::assertNull(AnsweredTransferLegPolicy::completedTransferPair(
            [$conversation, $consultation, $secondLeg],
            $transferer
        ));
        // Without an answered consultation leg there is nothing to complete.
        self::assertNull(AnsweredTransferLegPolicy::completedTransferPair([$conversation], $transferer));
    }

    /**
     * @return array<string, string>
     */
    private function row(string $srcChan, string $dstChan, string $answer): array
    {
        return [
            'transfer' => '1',
            'src_chan' => $srcChan,
            'dst_chan' => $dstChan,
            'answer' => $answer,
            'endtime' => '',
        ];
    }
}

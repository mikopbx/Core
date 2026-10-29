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

    public function testDoesNotKeepConversationWithPartyTransferredOnByBlindTransfer(): void
    {
        // A blind-transfers (**) B to C: B's own dial to C flags A->B as transfer=1.
        $hangupChannel = 'PJSIP/111-0000000b';
        $conversation = (object)$this->row($hangupChannel, 'PJSIP/233-0000000c', '2026-10-28 22:40:52.062');
        $onwardLeg = (object)$this->row('PJSIP/233-0000000c', '', '');
        $transferers = AnsweredTransferLegPolicy::onwardTransferers([$conversation, $onwardLeg]);

        self::assertSame([$hangupChannel, 'PJSIP/233-0000000c'], $transferers);
        self::assertFalse(AnsweredTransferLegPolicy::keepOpen($conversation, $hangupChannel, $transferers));
    }

    public function testKeepsConsultationLegOfTransfererThatIsDialing(): void
    {
        $transferer = 'PJSIP/233-00000001';
        $conversation = (object)$this->row('PJSIP/111-00000000', $transferer, '2026-10-28 22:19:23.354');
        $consultation = (object)$this->row($transferer, 'PJSIP/241-00000002', '2026-10-28 22:19:36.196');
        $transferers = AnsweredTransferLegPolicy::onwardTransferers([$conversation, $consultation]);

        self::assertTrue(AnsweredTransferLegPolicy::keepOpen($consultation, $transferer, $transferers));
    }

    public function testDoesNotKeepConversationTheTransfererPlacedItself(): void
    {
        // B called A, then consulted a queue whose rows ended before B hung up: B->A is B's
        // conversation, not a consultation leg.
        $transferer = 'PJSIP/233-0000000c';
        $conversation = (object)($this->row($transferer, 'PJSIP/111-0000000d', '2026-10-29 12:50:59.989')
            + ['start' => '2026-10-29 12:50:58.892']);
        $queueLeg = (object)array_merge(
            $this->row($transferer, 'Queue:2200', ''),
            ['start' => '2026-10-29 12:51:06.100', 'endtime' => '2026-10-29 12:51:07.300']
        );
        $notConsultation = AnsweredTransferLegPolicy::notConsultationLegs(
            [$conversation],
            [$conversation, $queueLeg],
            $transferer
        );

        self::assertContains('PJSIP/111-0000000d', $notConsultation);
        self::assertFalse(AnsweredTransferLegPolicy::keepOpen($conversation, $transferer, $notConsultation));
    }

    public function testKeepsConsultationAnsweredAfterTheLastDial(): void
    {
        // A called B; B consulted C, which answered after every leg had been dialed.
        $transferer = 'PJSIP/233-00000001';
        $conversation = (object)($this->row('PJSIP/111-00000000', $transferer, '2026-10-28 22:19:23.354')
            + ['start' => '2026-10-28 22:19:22.043']);
        $consultation = (object)($this->row($transferer, 'PJSIP/241-00000002', '2026-10-28 22:19:36.196')
            + ['start' => '2026-10-28 22:19:30.425']);
        $rows = [$conversation, $consultation];
        $notConsultation = AnsweredTransferLegPolicy::notConsultationLegs($rows, [$consultation], $transferer);

        self::assertNotContains('PJSIP/241-00000002', $notConsultation);
        self::assertTrue(AnsweredTransferLegPolicy::keepOpen($consultation, $transferer, $notConsultation));
    }

    public function testCompletedTransferPairHonoursNotConsultationLegs(): void
    {
        // The only answered leg of the transferer towards someone else is excluded: no pair.
        $transferer = 'PJSIP/206-00000081';
        $conversation = $this->row('PJSIP/provider-0000007c', $transferer, '2026-10-22 14:17:25.557');
        $onward = $this->row($transferer, 'PJSIP/259-00000088', '2026-10-22 14:17:43.457');

        self::assertNull(AnsweredTransferLegPolicy::completedTransferPair(
            [$conversation, $onward],
            $transferer,
            ['PJSIP/259-00000088']
        ));
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

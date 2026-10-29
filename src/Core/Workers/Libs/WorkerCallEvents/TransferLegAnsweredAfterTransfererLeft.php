<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Bills a transfer leg that answers after its transferer has already hung up (#1100).
 *
 * When the transferer of an attended transfer hangs up while its destination still
 * rings, Asterisk connects the transferee to the ringing destination. The transferer's
 * hangup closes every leg it dialed, and nothing is billed then (CreateRowTransfer skips
 * an unanswered leg): the destination may never answer, and a ring-all queue rings
 * several legs at once. The leg's transfer_dial_answer then finds it already closed.
 *
 * Here that answer gets the transferee<->destination row, from the real answer and with
 * the recording the answer started; the closed leg stays NOANSWER like the other legs.
 * A destination whose answer reaches the CDR only as a CEL ANSWER (an outgoing route whose
 * module sets OFF_ANSWER_SUB, so Dial() runs no answer subroutine) is billed when it hangs up.
 */
final class TransferLegAnsweredAfterTransfererLeft
{
    /**
     * transfer_dial_answer that found no open leg.
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        $answerChannel = (string)($data['agi_channel'] ?? '');
        $linkedId = (string)($data['linkedid'] ?? '');
        $leg = self::findClosedLeg((string)($data['transfer_UNIQUEID'] ?? ''), $answerChannel, true);
        if ($leg === null || $linkedId === '' || $worker->existsActiveChan((string)$leg->src_chan)) {
            return;
        }
        if (self::isBilled($linkedId, $answerChannel)) {
            return;
        }
        $transferee = self::findTransferee($worker, $linkedId, (string)$leg->src_chan, $answerChannel, true);
        if ($transferee === null) {
            return;
        }

        $insertData = self::rowData($leg, $transferee, $answerChannel, $linkedId, (string)$data['answer']);
        $recFile = (string)($data['recordingfile'] ?? '');
        if ($recFile !== '') {
            $worker->mixMonitorChannels[$answerChannel] = $recFile;
            $insertData['recordingfile'] = $recFile;
            $insertData['rec_src_channel'] = $worker->getRecSrcChannel(
                $answerChannel,
                $insertData['src_chan'],
                $answerChannel
            );
        }
        CreateRowTransfer::insertTransferRow($insertData);
    }

    /**
     * hangup_chan of a channel that answered (CEL ANSWER) while its transfer leg had been
     * closed unanswered by the transferer's hangup and no row bills it: the conversation is
     * billed from the later of the answer and the transferer's hangup (before it the
     * destination talked to the transferer) to this hangup. It has no recording: the answer
     * subroutine that starts one never ran.
     */
    public static function onChannelHangup(WorkerCallEvents $worker, array $data): void
    {
        $channel = (string)($data['agi_channel'] ?? '');
        $answeredAt = $worker->channelAnswerTimes[$channel] ?? '';
        $linkedId = (string)($data['linkedid'] ?? '');
        $end = (string)($data['end'] ?? '');
        if ($answeredAt === '' || $linkedId === '' || $end === '' || self::isBilled($linkedId, $channel)) {
            return;
        }
        $leg = CallDetailRecordsTmp::findFirst([
            'linkedid=:linkedid: AND dst_chan=:chan: AND answer = "" AND endtime <> "" AND src_chan <> ""',
            'bind' => ['linkedid' => $linkedId, 'chan' => $channel],
            'order' => 'start DESC',
        ]);
        if ($leg === null) {
            return;
        }
        $transfererActive = $worker->existsActiveChan((string)$leg->src_chan);
        if (!self::isLeftByTransferer((string)$leg->endtime, $end, $transfererActive)) {
            return;
        }
        $transferee = self::findTransferee($worker, $linkedId, (string)$leg->src_chan, $channel, false);
        if ($transferee === null) {
            return;
        }
        $answer = max($answeredAt, (string)$leg->endtime);

        $insertData = self::rowData($leg, $transferee, $channel, $linkedId, $answer);
        $insertData['endtime'] = $end;
        CreateRowTransfer::insertTransferRow($insertData);
    }

    /**
     * Whether an unanswered leg was closed by its transferer leaving, not by the hangup being
     * handled: a destination that answers and hangs up while the transferer still consults it
     * closes its own leg, and no transfer happened.
     */
    public static function isLeftByTransferer(string $legEndtime, string $channelEnd, bool $transfererActive): bool
    {
        return !$transfererActive && $legEndtime !== '' && $legEndtime < $channelEnd;
    }

    /**
     * The transfer leg closed unanswered by its transferer's hangup. A *8 pickup answers on a
     * channel that was never dialed, so the answer path also accepts the single closed leg of
     * the transfer whatever its dst_chan. A Local answering channel is not a pickup but the
     * phone's own 302 forward, whose real leg reports its answer by itself.
     */
    private static function findClosedLeg(
        string $transferUniqueId,
        string $channel,
        bool $allowPickup
    ): ?CallDetailRecordsTmp {
        if ($transferUniqueId === '' || $channel === '') {
            return null;
        }
        $legs = CallDetailRecordsTmp::find([
            '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer = "" AND endtime <> ""',
            'bind' => [
                'UNIQUEID' => $transferUniqueId,
                'UNIQUEID_CHAN' => $transferUniqueId . '_' . $channel,
            ],
        ]);
        $closed = [];
        foreach ($legs as $leg) {
            if ((string)$leg->src_chan === '') {
                continue;
            }
            if ((string)$leg->dst_chan === $channel) {
                return $leg;
            }
            $closed[] = $leg;
        }

        $isPickup = $allowPickup && stripos($channel, 'local/') !== 0;

        return ($isPickup && count($closed) === 1) ? $closed[0] : null;
    }

    /**
     * Whether the channel already has an answered row in this call, e.g. one CreateRowTransfer
     * made at the transferer's hangup or the answer path made before the leg hung up.
     */
    private static function isBilled(string $linkedId, string $channel): bool
    {
        return CallDetailRecordsTmp::findFirst([
            'linkedid=:linkedid: AND answer <> "" AND (src_chan=:chan: OR dst_chan=:chan:)',
            'bind' => ['linkedid' => $linkedId, 'chan' => $channel],
        ]) !== null;
    }

    /**
     * @param array{chan: string, num: string, name: string, call_id: string, did: string} $transferee
     */
    private static function rowData(
        CallDetailRecordsTmp $leg,
        array $transferee,
        string $destination,
        string $linkedId,
        string $answer
    ): array {
        return [
            'src_chan' => $transferee['chan'],
            'src_num' => $transferee['num'],
            'src_name' => $transferee['name'],
            'src_call_id' => $transferee['call_id'],
            'dst_chan' => $destination,
            'dst_num' => (string)$leg->dst_num,
            'dst_name' => (string)$leg->dst_name,
            'dst_call_id' => (string)$leg->dst_call_id,
            'start' => $answer,
            'answer' => $answer,
            'linkedid' => $linkedId,
            'UNIQUEID' => $leg->UNIQUEID . '_' . Util::generateRandomString(5),
            'did' => $transferee['did'],
            'transfer' => '0',
        ];
    }

    /**
     * The party the transferer left talking: the other side of its answered conversation.
     * On the answer it must still be on the line; on the leg's hangup it may have hung up
     * already. Ambiguity (several such parties) bills nothing.
     *
     * @return array{chan: string, num: string, name: string, call_id: string, did: string}|null
     */
    private static function findTransferee(
        WorkerCallEvents $worker,
        string $linkedId,
        string $transferer,
        string $destination,
        bool $requireActive
    ): ?array {
        $rows = CallDetailRecordsTmp::find([
            'linkedid=:linkedid: AND answer <> "" AND (src_chan=:chan: OR dst_chan=:chan:)',
            'bind' => ['linkedid' => $linkedId, 'chan' => $transferer],
        ]);
        $parties = [];
        foreach ($rows as $row) {
            $isSrc = ((string)$row->src_chan === $transferer);
            $chan = (string)($isSrc ? $row->dst_chan : $row->src_chan);
            if ($chan === '' || $chan === $destination || ($requireActive && !$worker->existsActiveChan($chan))) {
                continue;
            }
            $parties[$chan] = [
                'chan' => $chan,
                'num' => (string)($isSrc ? $row->dst_num : $row->src_num),
                'name' => (string)($isSrc ? $row->dst_name : $row->src_name),
                'call_id' => (string)($isSrc ? $row->dst_call_id : $row->src_call_id),
                'did' => (string)$row->did,
            ];
        }

        return count($parties) === 1 ? reset($parties) : null;
    }
}

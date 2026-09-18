<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionTransferDialHangup
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionTransferDialHangup
{
    /**
     * Executes the transfer dial hangup action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        $pos = stripos($data['agi_channel'], 'local/');
        if ($pos === false) {
            // Обработка локального канала.
            self::fillLocalChannelCdr($worker, $data);
        } elseif ('' === $data['ANSWEREDTIME']) {
            self::fillNotAnsweredCdr($worker, $data);
        }
    }

    /**
     * Fills the local channel CDR.
     *
     * @param WorkerCallEvents $worker The worker object.
     * @param array $data The data array.
     *
     * @return void
     */
    private static function fillLocalChannelCdr(WorkerCallEvents $worker, array $data): void
    {

        // This is NOT a local channel.
        // If it's a transfer completion (advisory), create a new CDR row.
        CreateRowTransfer::execute($worker, 'transfer_dial_hangup', $data);

        // Find previously recorded rows.
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND (src_chan=:chan: OR dst_chan=:chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'chan' => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Complete the call in CDR.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            if (!$row->save()) {
                SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }

        // Try to resume conversation recording.
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND transfer=1',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $res */
        $res = CallDetailRecordsTmp::findFirst($filter);
        if ($res !== null) {
            $info = pathinfo((string)$res->recordingfile);
            $data_time = (empty($res->answer)) ? $res->start : $res->answer;
            if ($data_time === null) {
                $data_time = 'now';
            }
            $subDir = date('Y/m/d/H/', strtotime($data_time));

            // Resume recording if monitoring is enabled.
            if ($res->dst_chan!==null
                && $res->src_num!==null
                && $res->dst_num!==null
                && $worker->enableMonitor($res->src_num, $res->dst_num)
            ) {
                $worker->MixMonitor($res->dst_chan, $info['filename'], $subDir, '', 'fillLocalChannelCdr');
                $recSrcCh = $worker->getRecSrcChannel($res->dst_chan, $res->src_chan, $res->dst_chan);
                $res->writeAttribute('rec_src_channel', $recSrcCh);
                $res->save();
            }
        }
    }

    /**
     * Fills the not answered CDR.
     *
     * @param WorkerCallEvents $worker The worker object.
     * @param array $data The data array.
     *
     * @return void
     */
    private static function fillNotAnsweredCdr(WorkerCallEvents $worker, array $data): void
    {
        $transferUniqueId = trim((string)($data['transfer_UNIQUEID'] ?? ''));
        $destinationChannel = trim((string)($data['dst_chan'] ?? ''));
        if ($transferUniqueId === '' && $destinationChannel === '') {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'Ignoring uncorrelated transfer_dial_hangup linkedid=%s channel=%s transferer=%s end=%s',
                    $data['linkedid'] ?? '',
                    $data['agi_channel'] ?? '',
                    $data['TRANSFERERNAME'] ?? '',
                    $data['end'] ?? ''
                ),
                LOG_WARNING
            );
            // The queue/ring-group management leg of an attended transfer collapses with an
            // empty dst_chan and no transfer_UNIQUEID, i.e. it lands here. That is exactly the
            // moment the operator is handed back to the caller, so still try to resume.
            self::resumeOperatorRecording($worker, $data);
            return;
        }

        // All parallel queue legs share linkedid and src_chan. Select the small candidate
        // set first, then match UNIQUEID in PHP so underscores are not SQL LIKE wildcards.
        $conditions = 'linkedid = :linkedid: AND endtime = "" AND transfer = "1" '
            . 'AND src_chan = :src_chan: AND answer = ""';
        $bind = [
            'linkedid' => $data['linkedid'] ?? '',
            'src_chan' => $data['TRANSFERERNAME'] ?? '',
        ];
        $filter = [
            $conditions,
            'bind' => $bind,
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        $matched = 0;
        foreach ($m_data as $row) {
            $isMatched = $transferUniqueId !== ''
                ? TransferCdrLegMatcher::matches((string)$row->UNIQUEID, $transferUniqueId)
                : (string)$row->dst_chan === $destinationChannel;
            if (!$isMatched) {
                continue;
            }

            // There was no answer. The transfer was canceled.
            $row->writeAttribute('endtime', $data['end'] ?? '');
            $row->writeAttribute('transfer', 0);
            if (!$row->save()) {
                SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
                continue;
            }
            ++$matched;
        }
        if ($matched === 0 || $matched > 1) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'transfer_dial_hangup matched rows=%d linkedid=%s transfer_UNIQUEID=%s',
                    $matched,
                    $data['linkedid'] ?? '',
                    $transferUniqueId
                ),
                LOG_DEBUG
            );
        }
        // Resume the operator's recording once the consultation is gone (see method doc).
        self::resumeOperatorRecording($worker, $data);
    }

    /**
     * Resumes the operator's own recording after a failed/cancelled attended transfer.
     *
     * ActionTransferCheck stops MixMonitor when the transfer starts and never restarts it.
     * The former "resume only when the linkedid has exactly one open row" rule never held
     * for a transfer to a queue/ring group (which always leaves several open rows — the
     * queue app row plus the parallel agent legs), so the recording stayed off for the rest
     * of the conversation.
     *
     * The decision is keyed on the operator channel (TRANSFERERNAME): the operator's answered
     * conversation row is resumed only once Asterisk reports the operator bridged back to
     * that conversation's caller (BRIDGEPEER equals the caller channel). While the operator
     * is still consulting BRIDGEPEER names another channel, and once a transfer completes the
     * operator has left (empty/other BRIDGEPEER); in both cases nothing is resumed and the
     * transfer marker is left intact, so a completed transfer is never mistaken for a return.
     *
     * @param WorkerCallEvents $worker The worker object.
     * @param array $data The data array.
     *
     * @return void
     */
    private static function resumeOperatorRecording(WorkerCallEvents $worker, array $data): void
    {
        $transferer = (string)($data['TRANSFERERNAME'] ?? '');
        if ($transferer === '') {
            return;
        }

        // The operator's answered conversation row was flagged transfer=1 and had its
        // recording stopped by ActionTransferCheck. Once it is resumed the flag is cleared,
        // so an empty result means there is nothing to resume — skip the AMI probe entirely.
        // (A pending-leg count cannot gate this: the uncorrelated queue/ring-group legs stay
        // open with transfer=1 until the final hangup, so they never clear.)
        $answeredConversations = CallDetailRecordsTmp::find([
            'linkedid = :linkedid: AND endtime = "" AND transfer = "1" AND answer <> "" '
            . 'AND (src_chan = :chan: OR dst_chan = :chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'] ?? '',
                'chan' => $transferer,
            ],
        ]);
        if ($answeredConversations->count() === 0) {
            return;
        }

        // Resume only once Asterisk reports the operator bridged back to this conversation's
        // caller. An empty/other BRIDGEPEER (still consulting, or the transfer completed and
        // the operator left) yields no match, so nothing is resumed and the transfer marker
        // is left intact for a later, correct attempt.
        $bridgePeer = $worker->getChannelVariable($transferer, 'BRIDGEPEER');
        $row = FailedTransferResumeSelector::select($answeredConversations, $transferer, $bridgePeer);
        if ($row === null) {
            return;
        }

        // Resume conversation recording on the operator's own row.
        $info = pathinfo((string)$row->recordingfile);
        $data_time = ($row->answer === '' || $row->answer === null) ? $row->start : $row->answer;
        $subDir = date('Y/m/d/H/', strtotime((string)$data_time));
        if (!empty($row->dst_chan) && $worker->enableMonitor((string)$row->src_num, (string)$row->dst_num)) {
            $worker->MixMonitor($row->dst_chan, $info['filename'], $subDir, '', 'fillNotAnsweredCdr');
            $recSrcCh = $worker->getRecSrcChannel($row->dst_chan, $row->src_chan, $row->dst_chan);
            $row->writeAttribute('rec_src_channel', $recSrcCh);
        }

        // Clear the transfer flag so the recording is resumed once and the row closes
        // normally on the final hangup.
        $row->writeAttribute('transfer', 0);
        if (!$row->save()) {
            SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
        }
    }

}

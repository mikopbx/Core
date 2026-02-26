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
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionHangupChan
 *  This class handles the execution of a hangup actions.
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionHangupChan
{
    /**
     * Executes the hangup channel action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The data containing call details.
     *
     * @return void
     * @throws \Exception
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        // Remove the agi_channel from the active channels in the worker.
        $worker->removeActiveChan($data['agi_channel']);

        // Initialize arrays for channels and transfer calls.
        $channels = [];
        $transfer_calls = [];

        // Hangup channel for end calls.
        self::hangupChanEndCalls($worker, $data, $transfer_calls, $channels);

        // Check if it's a regular transfer.
        CreateRowTransfer::execute($worker, 'hangup_chan', $data, $transfer_calls);

        // Check if it's a SIP transfer.
        self::hangupChanCheckSipTrtansfer($worker, $data, $channels);

        // Clear memory.
        if (isset($worker->checkChanHangupTransfer[$data['agi_channel']])) {
            unset($worker->checkChanHangupTransfer[$data['agi_channel']]);
        }
        if (isset($worker->mixMonitorChannels[$data['agi_channel']])) {
            unset($worker->mixMonitorChannels[$data['agi_channel']]);
        }
    }

    /**
     * Hangs up the channel for end calls.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The data containing call details.
     * @param array $transfer_calls The array to store transfer calls.
     * @param array $channels The array to store channels.
     *
     * @return void
     */
    private static function hangupChanEndCalls(WorkerCallEvents $worker, array $data, array &$transfer_calls, array &$channels): void
    {
        $filter = [
            'linkedid=:linkedid: AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        $countRows = 0;
        $transferCdrAnswered = true;
        foreach ($m_data as $row) {
            if ($row->dst_chan !== $data['agi_channel'] && $data['agi_channel'] !== $row->src_chan) {
                continue;
            }
            $countRows++;
            $vmState = $data['VMSTATUS'] ?? '';
            if ($row->dst_num === VoiceMailConf::VOICE_MAIL_EXT && $vmState !== 'FAILED') {
                // This call will be ended by the voicemail_end event.
                continue;
            }
            if ($row->transfer === '1' && !empty($row->dst_chan)) {
                // Make sure the destination channel is not empty.
                // Otherwise, it's not a transfer.
                $transfer_calls[] = $row->toArray();
                $transferCdrAnswered = min($transferCdrAnswered, empty($row->answer));
            }
        }
        foreach ($m_data as $row) {
            if ($row->dst_chan !== $data['agi_channel'] && $data['agi_channel'] !== $row->src_chan) {
                continue;
            }
            $vmState = $data['VMSTATUS'] ?? '';
            if ($row->dst_num === VoiceMailConf::VOICE_MAIL_EXT && $vmState !== 'FAILED') {
                // This call will be ended by the voicemail_end event.
                continue;
            }
            if ($row->dialstatus === 'ORIGINATE') {
                $row->writeAttribute('dialstatus', '');
                if ($row->answer === '') {
                    $newId = $row->linkedid . '_' . $row->src_num . '_' . substr($row->src_chan, strpos($row->src_chan, '-') + 1);
                    $row->writeAttribute('UNIQUEID', $newId);
                }
            }
            $row->writeAttribute('endtime', $data['end']);
            $wasTransfer = ($row->transfer === '1');
            $row->writeAttribute('transfer', 0);
            if ($transferCdrAnswered === false && count($transfer_calls) === 2) {
                // Call termination for consultative transfer. Initiator hung up before the destination answered.
                $row->writeAttribute('a_transfer', 1);
            }
            if ($data['dialstatus'] !== '') {
                if ($data['dialstatus'] === 'ORIGINATE') {
                    $row->writeAttribute('dst_chan', '');
                }
                $row->writeAttribute('dialstatus', $data['dialstatus']);
            }
            $res = $row->update();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_hangup_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }

            if ($row->src_chan !== $data['agi_channel']) {
                $channels[] = [
                    'chan' => $row->src_chan,
                    'did' => $row->did,
                    'num' => $row->src_num,
                    'out' => true,
                ];
            } else {
                if (!$wasTransfer) {
                    $worker->StopMixMonitor($row->dst_chan, 'hangupChanEndCalls');
                }
                $channels[] = [
                    'chan' => $row->dst_chan,
                    'did' => $row->did,
                    'num' => $row->dst_num,
                    'out' => false,
                ];
            }
        }

        // Fallback: when a SIP transfer to a queue occurred, the sip_transfer CDR record
        // was created with the original call's linkedid, but the endpoint's linkedid was NOT
        // updated by Asterisk (Local channel intermediaries prevent propagation).
        // Search by channel name to find and close these orphaned CDR records.
        if ($countRows === 0) {
            $filter = [
                '(src_chan=:chan: OR dst_chan=:chan:) AND endtime = ""',
                'bind' => ['chan' => $data['agi_channel']],
            ];
            $fallbackData = CallDetailRecordsTmp::find($filter);
            foreach ($fallbackData as $row) {
                $row->writeAttribute('endtime', $data['end']);
                $row->writeAttribute('transfer', 0);
                $res = $row->update();
                if (!$res) {
                    SystemMessages::sysLogMsg('Action_hangup_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
                }
            }
        }

        // The SRC channel has been completed and DST channel has not been created
        $filter = [
            'verbose_call_id=:verbose_call_id: AND endtime = "" AND dst_chan = "" AND src_chan = :src_chan:',
            'bind' => [
                'verbose_call_id' => $data['verbose_call_id'],
                'src_chan' => $data['agi_channel'],
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $row->start);
            $row->writeAttribute('transfer', 0);
            $res = $row->update();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_hangup_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }

        self::regMissedCall($data, $countRows);
    }

    /**
     * Registers a missed call.
     *
     * @param array $data The data containing call details.
     * @param int $tmpCdrCount The count of temporary CDRs.
     *
     * @return void
     */
    private static function regMissedCall(array $data, int $tmpCdrCount): void
    {
        if ($tmpCdrCount > 0 || $data['did'] === '') {
            return;
        }
        if (stripos($data['agi_channel'], 'local/') !== false) {
            // Do not log missed calls for local channels.
            return;
        }
        $filter = [
            'linkedid=:linkedid: AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['agi_channel'],
                'dst_chan' => $data['agi_channel'],
            ],
        ];
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if ($m_data !== null) {
            return;
        }
        if (empty($data['UNIQUEID'])) {
            $data['UNIQUEID'] = $data['agi_threadid'];
        }
        $time = intval(str_replace('mikopbx-', '', $data['linkedid']));
        $data['start'] = date("Y-m-d H:i:s.v", $time);
        $data['endtime'] = $data['end'];

        InsertDataToDB::execute($data, $data['agi_channel']);
    }

    /**
     * Checks for SIP transfers when hanging up a channel.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The data containing call details.
     * @param array $channels The list of channels.
     *
     * @return void
     * @throws \Exception
     */
    public static function hangupChanCheckSipTrtansfer(WorkerCallEvents $worker, array $data, array $channels): void
    {
        $not_local = (stripos($data['agi_channel'], 'local/') === false);
        if ($not_local === false || $data['OLD_LINKEDID'] !== $data['linkedid']) {
            return;
        }
        $am = Util::getAstManager('off');
        $active_chans = $am->GetChannels(false);

        // Check for SIP transfers
        foreach ($channels as $data_chan) {
            if (!in_array($data_chan['chan'], $active_chans, true)) {
                // The call is already completed. Not interested.
                continue;
            }
            $BRIDGEPEER = $am->GetVar($data_chan['chan'], 'BRIDGEPEER', null, false);
            if (!is_string($BRIDGEPEER) || !in_array($BRIDGEPEER, $active_chans, true)) {
                // The call is already completed. Not interested.
                continue;
            }

            $linkedid = $am->GetVar($data_chan['chan'], 'CHANNEL(linkedid)', null, false);
            if (empty($linkedid)) {
                continue;
            }
            if ($linkedid === $data['linkedid']) {
                // Direct linkedid check shows no change. Try following the Local channel chain.
                // When a transfer targets a queue, the endpoint (e.g. PJSIP/201) stays in its
                // original bridge with Local/xxx;2. The linkedid only propagates in the bridge
                // where the actual channel swap occurred (Local/xxx;1's bridge).
                // Traverse: endpoint → BRIDGEPEER(Local;2) → otherHalf(Local;1) → check linkedid.
                $linkedid = self::resolveLinkedIdThroughLocalChain($am, $data_chan['chan'], $data['linkedid'], $active_chans);
                if ($linkedid === null) {
                    continue;
                }
            }

            $CALLERID = $am->GetVar($BRIDGEPEER, 'CALLERID(num)', null, false);
            $n_data['action'] = 'sip_transfer';
            $n_data['src_chan'] = $data_chan['out'] ? $data_chan['chan'] : $BRIDGEPEER;
            $n_data['src_num'] = $data_chan['out'] ? $data_chan['num'] : $CALLERID;
            $n_data['dst_chan'] = $data_chan['out'] ? $BRIDGEPEER : $data_chan['chan'];
            $n_data['dst_num'] = $data_chan['out'] ? $CALLERID : $data_chan['num'];
            $n_data['start'] = date('Y-m-d H:i:s');
            $n_data['answer'] = date('Y-m-d H:i:s');
            $n_data['linkedid'] = $linkedid;
            $n_data['UNIQUEID'] = $data['linkedid'] . Util::generateRandomString();
            $n_data['transfer'] = '0';
            if ($worker->enableMonitor($n_data['src_num'] ?? '', $n_data['dst_num'] ?? '')) {
                $n_data['recordingfile'] = $worker->MixMonitor($n_data['dst_chan'], $n_data['UNIQUEID'], '', '', 'hangupChanCheckSipTrtansfer');
                $n_data['rec_src_channel'] = $worker->getRecSrcChannel($n_data['dst_chan'], $n_data['src_chan'] ?? '', $n_data['dst_chan']);
            }
            $n_data['did'] = $data_chan['did'];

            InsertDataToDB::execute($n_data);
            $filter = [
                'linkedid=:linkedid:',
                'bind' => ['linkedid' => $data['linkedid']],
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                $row->writeAttribute('linkedid', $linkedid);
                $row->save();
            }

            // Sending UserEvent
            $AgiData = base64_encode(json_encode($n_data));
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
        }
    }

    /**
     * Follows the Local channel chain to find a channel with a different linkedid.
     *
     * When a SIP transfer targets a queue, the endpoint (e.g. PJSIP/201) remains in its
     * original bridge with Local/xxx;2 and its linkedid is NOT updated by Asterisk.
     * However, the other half (Local/xxx;1) IS in the bridge where the transfer channel swap
     * occurred, so its linkedid WAS updated to the original call's linkedid.
     *
     * This method traverses: channel → BRIDGEPEER (Local;2) → otherHalf (Local;1) → linkedid.
     * Supports multiple levels of Local channel nesting (max depth 3).
     *
     * @param \MikoPBX\Core\Asterisk\AsteriskManager $am AMI connection.
     * @param string $channel Starting channel to trace from.
     * @param string $originalLinkedid The linkedid to compare against (hangup channel's linkedid).
     * @param array $activeChans List of currently active channels.
     * @return string|null The different linkedid found, or null if chain traversal finds nothing.
     */
    private static function resolveLinkedIdThroughLocalChain(
        $am,
        string $channel,
        string $originalLinkedid,
        array $activeChans
    ): ?string {
        $maxDepth = 3;
        $currentChannel = $channel;
        $visited = [$channel];

        for ($i = 0; $i < $maxDepth; $i++) {
            $bridgePeer = $am->GetVar($currentChannel, 'BRIDGEPEER', null, false);
            if (!is_string($bridgePeer) || !in_array($bridgePeer, $activeChans, true)) {
                break;
            }

            // BRIDGEPEER must be a Local channel to continue traversal
            if (stripos($bridgePeer, 'local/') === false) {
                break;
            }

            // Get the other half of the Local channel pair (;2 → ;1 or ;1 → ;2)
            $otherHalf = self::getLocalChannelOtherHalf($bridgePeer);
            if ($otherHalf === null || !in_array($otherHalf, $activeChans, true)) {
                break;
            }

            if (in_array($otherHalf, $visited, true)) {
                break;
            }
            $visited[] = $otherHalf;

            // Check linkedid on the other half — it may have been updated by the bridge merge
            $linkedid = $am->GetVar($otherHalf, 'CHANNEL(linkedid)', null, false);
            if (!empty($linkedid) && $linkedid !== $originalLinkedid) {
                return $linkedid;
            }

            // Continue traversal from the other half
            $currentChannel = $otherHalf;
        }

        return null;
    }

    /**
     * Converts a Local channel name from one half to the other.
     *
     * @param string $localChannel e.g. "Local/201@internal-00000008;2"
     * @return string|null The other half, e.g. "Local/201@internal-00000008;1", or null if not a Local channel.
     */
    private static function getLocalChannelOtherHalf(string $localChannel): ?string
    {
        if (str_ends_with($localChannel, ';1')) {
            return substr($localChannel, 0, -1) . '2';
        }
        if (str_ends_with($localChannel, ';2')) {
            return substr($localChannel, 0, -1) . '1';
        }
        return null;
    }
}

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
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;


/**
 * Class CreateRowTransfer
 *
 * Handles the creation of transfer rows in call detail records.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class CreateRowTransfer
{

    /**
     * Executes the creation of transfer rows in call detail records.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param string $action The action type.
     * @param array $data The event data.
     * @param array|null $calls_data The call data.
     */
    public static function execute(WorkerCallEvents $worker, $action, $data, $calls_data = null): void
    {
        if (isset($worker->checkChanHangupTransfer[$data['agi_channel']])) {
            return;
        }
        $worker->checkChanHangupTransfer[$data['agi_channel']] = $action;
        self::initCallsData($data, $calls_data);
        if (count($calls_data) === 2) {
            // Normal transfer.
            self::fillRedirectCdrData($worker, $action, $data, $calls_data);
        } elseif (self::isFailRedirect($calls_data)) {
            // Failed transfer.
            self::fillFailRedirectCdrData($worker, $data, $calls_data);
        }
    }

    /**
     * Initializes the call data from the database.
     *
     * @param array $data The event data.
     * @param array|null $calls_data The call data.
     */
    private static function initCallsData($data, &$calls_data): void
    {
        if (null === $calls_data) {
            $filter = [
                'linkedid=:linkedid: AND endtime = "" AND transfer=1 AND (src_chan=:chan: OR dst_chan=:chan:)',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                    'chan' => $data['agi_channel'],
                ],
                'order' => 'is_app',
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            $calls_data = $m_data->toArray();
        }
    }

    /**
     * Handles the data for normal transfers.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param string $action The action type.
     * @param array $data The event data.
     * @param array $calls_data The call data.
     */
    private static function fillRedirectCdrData($worker, $action, $data, $calls_data): void
    {
        $insert_data = [];
        foreach ($calls_data as $row_data) {
            if ($row_data['src_chan'] === $data['agi_channel']) {
                $fname_chan = isset($insert_data['dst_chan']) ? 'src_chan' : 'dst_chan';
                $fname_num = isset($insert_data['dst_num']) ? 'src_num' : 'dst_num';

                $insert_data[$fname_chan] = $row_data['dst_chan'];
                $insert_data[$fname_num] = $row_data['dst_num'];
            } else {
                $fname_chan = !isset($insert_data['src_chan']) ? 'src_chan' : 'dst_chan';
                $fname_num = !isset($insert_data['src_num']) ? 'src_num' : 'dst_num';

                $insert_data[$fname_chan] = $row_data['src_chan'];
                $insert_data[$fname_num] = $row_data['src_num'];
            }
        }
        // Запись разговора.
        $worker->StopMixMonitor($insert_data['src_chan'], 'fillRedirectCdrData');
        $worker->StopMixMonitor($insert_data['dst_chan'], 'fillRedirectCdrData');

        $recordingfile = '-';
        if ($worker->enableMonitor($insert_data['src_num'], $insert_data['dst_num'])) {
            $recordingfile = $worker->MixMonitor(
                $insert_data['dst_chan'],
                'transfer_' . $insert_data['src_num'] . '_' . $insert_data['dst_num'] . '_' . $data['linkedid'],
                '',
                '',
                'fillLocalChannelCdr'
            );
        }

        $insert_data['recordingfile'] = $recordingfile;
        $insert_data['start'] = $data['end'];
        $insert_data['answer'] = $data['end'];
        $insert_data['linkedid'] = $data['linkedid'];
        $insert_data['UNIQUEID'] = $data['agi_threadid'];
        $insert_data['did'] = $data['did'];
        $insert_data['transfer'] = '0';

        // Send UserEvent
        $insert_data['action'] = 'transfer_dial_create_cdr';

        $AgiData = base64_encode(json_encode($insert_data));
        $am = Util::getAstManager('off');
        $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);

        InsertDataToDB::execute($insert_data);
    }

    /**
     * Checks if the transfer is failed.
     *
     * @param array $calls_data The call data.
     * @return bool Whether the transfer is failed or not.
     */
    private static function isFailRedirect($calls_data): bool
    {
        return empty($calls_data[0]['answer']) && count($calls_data) === 1;
    }

    /**
     * Handles the data for failed transfers.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @param array $calls_data The call data.
     */
    private static function fillFailRedirectCdrData(WorkerCallEvents $worker, $data, $calls_data): void
    {
        // Resume recording when transfer is interrupted.
        $row_data = $calls_data[0];
        $chan = ($data['agi_channel'] === $row_data['src_chan']) ? $row_data['dst_chan'] : $row_data['src_chan'];
        // Find not ended call detail records.
        $filter = [
            'linkedid=:linkedid: AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
            'order' => 'is_app',
        ];
        /** @var CallDetailRecordsTmp $not_ended_cdr */
        $cdrData = CallDetailRecordsTmp::find($filter);
        /** @var CallDetailRecordsTmp $row */
        $not_ended_cdr = null;
        $transferNotComplete = false;
        foreach ($cdrData as $row) {
            if ($row->transfer === '1' && ($row->src_chan === $chan || $row->dst_chan === $chan)) {
                $not_ended_cdr = $row;
            }
            if ($row->answer === '' && $row->endtime === ''
                && ($row->src_chan === $chan || $row->dst_chan === $chan)) {
                $transferNotComplete = true;
            }
        }
        if ($not_ended_cdr !== null && !$transferNotComplete) {
            $worker->StopMixMonitor($not_ended_cdr->src_chan, 'fillFailRedirectCdrData');
            // Check if recording file is not empty and enable monitor for the call.
            if (!empty($not_ended_cdr->recordingfile) && $worker->enableMonitor($not_ended_cdr->src_num, $not_ended_cdr->dst_num)) {
                $worker->MixMonitor($not_ended_cdr->dst_chan, '', '', $not_ended_cdr->recordingfile, 'fillFailRedirectCdrData');
            }
        }
    }

}
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
    public static function execute(WorkerCallEvents $worker, $data): void
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
    private static function fillLocalChannelCdr(WorkerCallEvents $worker, $data): void
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
    private static function fillNotAnsweredCdr(WorkerCallEvents $worker, $data): void
    {
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND (src_chan=:src_chan: AND dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['TRANSFERERNAME'],
                'dst_chan' => $data['dst_chan'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // There was no answer. The transfer was canceled.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            if (!$row->save()) {
                SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
        $filter = [
            'linkedid=:linkedid: AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        if ($m_data->count() !== '1') {
            // The transfer is not completed or channels no longer exist.
            return;
        }

        // Try to resume conversation recording.
        foreach ($m_data as $row) {
            $info = pathinfo($row->recordingfile);
            $data_time = ($row->answer === '') ? $row->start : $row->answer;
            $subDir = date('Y/m/d/H/', strtotime($data_time));

            // Resume recording if monitoring is enabled.
            if ($worker->enableMonitor($row->src_num, $row->dst_num)) {
                $worker->MixMonitor($row->dst_chan, $info['filename'], $subDir, '', 'fillNotAnsweredCdr');
            }

            // Remove the transfer flag from the rows.
            $row->writeAttribute('transfer', 0);
            if (!$row->save()) {
                SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

}
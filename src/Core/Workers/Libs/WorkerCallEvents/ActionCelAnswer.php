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
 * Class ActionCelAnswer
 * This class is responsible for handling certain events when a call is answered.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionCelAnswer
{
    /**
     * Executes the action when a Call Event Log (CEL) answer event occurs.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $channel = $data['Channel'] ?? '';
        $worker->addActiveChan($channel, $data['LinkedID']);

        // If no channel data, or if the channel is local, or if the channel is already active, return immediately
        if (empty($channel) || stripos($channel, 'local') === 0 || $worker->existsActiveChan($channel)) {
            return;
        }
        usleep(100000);  // delay to ensure the channel is properly added

        // Retrieve the linked identifier for the channel
        $linkedId = Util::getAstManager('off')->GetVar($channel, 'CHANNEL(linkedid)', '', false);

        // If the linkedId matches the data LinkedID, return immediately
        if (empty($linkedId) || $linkedId === $data['LinkedID']) {
            return;
        }

        // This is a return call after consultative transfer
        $filter = [
            'linkedid=:linkedid: AND a_transfer = "1"',
            'bind' => [
                'linkedid' => $linkedId,
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->a_transfer = '0';
            $row->save();
            if ($worker->existsActiveChan($row->src_chan)) {
                $chan = $row->src_chan;
                $number = $row->src_num;
            } elseif ($worker->existsActiveChan($row->dst_chan)) {
                $chan = $row->dst_chan;
                $number = $row->dst_num;
            } else {
                continue;
            }

            // Data for the returned call after transfer
            $insert_data['action'] = "ret_after_trasfer";
            $insert_data['start'] = date('Y-m-d H:i:s.v', str_replace('mikopbx-', '', $data['LinkedID']));
            $insert_data['answer'] = $data['EventTime'];
            $insert_data['src_chan'] = $chan;
            $insert_data['src_num'] = $number;
            $insert_data['dst_chan'] = $channel;
            $insert_data['dst_num'] = $data['CallerIDnum'];
            $insert_data['linkedid'] = $linkedId;
            $insert_data['UNIQUEID'] = $data['UniqueID'] . "_" . Util::generateRandomString();
            $insert_data['did'] = $row->did;
            $insert_data['transfer'] = '0';

            if ($worker->enableMonitor($insert_data['src_num'] ?? '', $insert_data['dst_num'] ?? '')) {
                $insert_data['recordingfile'] = $worker->MixMonitor($insert_data['dst_chan'], $insert_data['UNIQUEID'], '', '', 'ret_after_trasfer');
            }

            // Insert the new data into the database
            InsertDataToDB::execute($insert_data);
        }
    }

}
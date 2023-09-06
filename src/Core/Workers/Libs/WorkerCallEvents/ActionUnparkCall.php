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
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionUnparkCall
 *
 * Handles the action of removing a call from parking.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionUnparkCall
{
    /**
     * Executes the action of removing a call from parking.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $data['recordingfile'] = "";

        // Enable recording if monitoring is enabled.
        if ($worker->enableMonitor($data['src_num'], $data['dst_num'])) {
            $data['recordingfile'] = $worker->MixMonitor($data['dst_chan'], $data['UNIQUEID'], '', '', 'ActionUnparkCall');
        }

        // Insert data to DB.
        InsertDataToDB::execute($data);
        if (is_array($data['data_parking'])) {
            // Insert parking data to DB if available.
            InsertDataToDB::execute($data['data_parking']);
        }

        // Delete previously recorded rows.
        $filter = [
            "linkedid=:linkedid: AND src_chan=:src_chan:",
            'bind' => [
                'linkedid' => $data['linkedid_old'],
                'src_chan' => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->delete();
        }
    }
}
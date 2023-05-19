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
 * Class ActionTransferCheck
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionTransferCheck
{
    /**
     * Executes the action for checking transfers.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND transfer=0 AND (src_chan=:src_chan: OR dst_chan=:src_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['src_chan'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {

            // Attempt to stop the call recording.
            $worker->StopMixMonitor($row->dst_chan, 'ActionTransferCheck_' . $row->verbose_call_id);
            $worker->StopMixMonitor($row->src_chan, 'ActionTransferCheck_' . $row->verbose_call_id);

            // Set the transfer flag.
            $row->writeAttribute('transfer', 1);
            $row->save();
        }
    }
}
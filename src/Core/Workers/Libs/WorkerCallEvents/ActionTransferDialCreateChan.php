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
 * Class ActionTransferDialCreateChan
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionTransferDialCreateChan
{
    /**
     * Executes the transfer dial create channel action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $chan = $data['dst_chan'] ?? '';
        if (!empty($chan)) {
            $worker->addActiveChan($chan, $data['linkedid']);
        }
        $filter = [
            'UNIQUEID=:UNIQUEID: AND endtime = "" AND answer = ""',
            'bind' => [
                'UNIQUEID' => $data['transfer_UNIQUEID'],
            ],
        ];
        $row_create = false;
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Check if there is more than one SIP/256 channel in an incoming call.
            if (!empty($row->dst_chan) && $data['dst_chan'] !== $row->dst_chan) {
                if ($row_create) {
                    continue;
                }
                // Duplicate the call record row.
                $new_row = new CallDetailRecordsTmp();
                $f_list = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute('dst_chan', $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['transfer_UNIQUEID'] . '_' . $data['dst_chan']);
                // $new_row->save();
                // Replace the current record with the new one and set the row_create flag to true.
                $row = $new_row;
                $row_create = true;
            } // END IF

            $row->writeAttribute('dst_chan', $data['dst_chan']);
            if (isset($data['dst_call_id']) && !empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }
            $res = $row->save();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_transfer_dial_create_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }
}
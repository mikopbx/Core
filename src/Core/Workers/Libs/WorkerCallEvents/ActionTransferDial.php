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
 * Class ActionTransferDial
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionTransferDial
{
    /**
     * Executes the transfer dial action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $chan = $data['src_chan'] ?? '';
        if (!empty($chan)) {
            $worker->addActiveChan($chan, $data['linkedid']);
        }
        if ($data['is_queue'] !== '1') {
            // End the previous unsuccessful Dial if the destination channel was not created.
            $filter = [
                'transfer=1 AND endtime = "" AND dst_chan="" AND linkedid=:linkedid:',
                'bind' => [
                    'linkedid' => $data['linkedid']
                ],
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            /** @var CallDetailRecordsTmp $row */
            foreach ($m_data as $row) {
                // Set the end time for the transfer.
                $row->writeAttribute('endtime', $data['start']);
                $row->save();
            }
        }

        ActionTransferCheck::execute($worker, $data);
        InsertDataToDB::execute($data);
        ActionAppEnd::execute($worker, $data);
    }
}
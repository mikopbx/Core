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
 * Class ActionDialEnd
 * This class handles the execution of ending a dial action.
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionDialEnd
{

    /**
     * Executes the ending of a dial action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The data containing call details.
     *
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        // Get the filter conditions based on the data.
        $filter = self::getFilter($data);

        // Find all records that satisfy the filter conditions.
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Update the 'endtime' attribute of the record with the provided endtime value.
            $row->writeAttribute('endtime', $data['endtime']);
            $res = $row->update();
            if (!$res) {
                SystemMessages::sysLogMsg(static::class, implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Generates a filter for querying Call Detail Records (CDRs) based on the provided data.
     *
     * @param array $data The data containing call details.
     *
     * @return array The filter array used for querying specific CDRs.
     */
    private static function getFilter($data): array
    {
        return [
            'UNIQUEID=:UNIQUEID: AND src_chan=:src_chan: AND dst_chan = ""',
            'bind' => [
                'UNIQUEID' => $data['UNIQUEID'],
                'src_chan' => $data['src_chan'],
            ],
        ];
    }
}
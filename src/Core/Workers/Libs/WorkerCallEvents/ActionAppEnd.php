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
 * Class ActionAppEnd
 * This class is responsible for ending an application action.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionAppEnd
{

    /**
     * Executes the end application action.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Array of data needed for execution.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        $filter = self::getFilter($data);
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */

        // Fetch records based on the generated filter
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Update endtime attribute with start data
            $row->writeAttribute('endtime', $data['start']);
            $res = $row->update();

            // Check if the record was updated successfully, if not log the error messages
            if (!$res) {
                SystemMessages::sysLogMsg(static::class, implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Generates a filter based on the given data.
     *
     * @param array $data Data used to create the filter.
     * @return array Returns the filter as an array.
     */
    private static function getFilter(array $data): array
    {
        return [
            'linkedid=:linkedid: AND is_app=1 AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
    }

}
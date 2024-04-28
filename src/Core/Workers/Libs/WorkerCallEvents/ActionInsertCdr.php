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

use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionInsertCdr
 * Handles the processing of the call start event for inserting call detail records.
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionInsertCdr
{
    /**
     * Executes the insert CDR action for the call start event.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $cdr The call detail record data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $cdr): void
    {
        foreach ($cdr['rows'] as $data) {
            if (empty($data['UNIQUEID'])) {
                SystemMessages::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
                return;
            }
            $m_data = CallDetailRecords::findFirst(
                [
                    "UNIQUEID=:id:",
                    'bind' => [
                        'id' => $data['UNIQUEID'],
                    ],
                ]
            );
            if (!$m_data) {
                /** @var CallDetailRecords $m_data */
                $m_data = new CallDetailRecords();
            }
            $f_list = $m_data->toArray();
            foreach ($data as $attribute => $value) {
                if (!array_key_exists($attribute, $f_list)) {
                    continue;
                }
                $m_data->writeAttribute($attribute, $value);
            }
            if (!$m_data->save()) {
                SystemMessages::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
            }
        }
    }
}
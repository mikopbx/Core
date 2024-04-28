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
use MikoPBX\Core\System\Util;


/**
 * Class UpdateDataInDB
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class UpdateDataInDB
{

    /**
     * Execute updating data in the database.
     *
     * @param array $data The data to be updated.
     * @return void
     */
    public static function execute($data): void
    {
        if (empty($data['UNIQUEID'])) {
            SystemMessages::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
            return;
        }
        $filter = [
            "UNIQUEID=:id:",
            'bind' => ['id' => $data['UNIQUEID'],],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if ($m_data === null) {
            return;
        }
        $f_list = $m_data->toArray();
        foreach ($data as $attribute => $value) {
            if (!array_key_exists($attribute, $f_list)) {
                continue;
            }
            if ('UNIQUEID' === $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if (!$res) {
            SystemMessages::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
        }

        self::sendUserEventData($m_data, $data);

        if ($res && $m_data->work_completed === "1") {
            // Delete data from the temporary table, as they have already been moved to the permanent one.
            $m_data->delete();
        }

    }

    /**
     * Send user event data.
     *
     * @param CallDetailRecordsTmp $m_data The CallDetailRecordsTmp object.
     * @param array $data The additional data.
     * @return void
     */
    private static function sendUserEventData(CallDetailRecordsTmp $m_data, $data): void
    {
        $insert_data = $m_data->toArray();
        if ($insert_data['work_completed'] === "1") {
            $insert_data['action'] = "hangup_update_cdr";
            $insert_data['GLOBAL_STATUS'] = $data['GLOBAL_STATUS'] ?? $data['disposition'];
            unset(
                $insert_data['src_chan'],
                $insert_data['dst_chan'],
                $insert_data['work_completed'],
                $insert_data['id'],
                $insert_data['from_account'],
                $insert_data['to_account'],
                $insert_data['appname'],
                $insert_data['is_app'],
                $insert_data['transfer']
            );
            $am = Util::getAstManager('off');
            $am->UserEvent('CdrConnector', ['AgiData' => base64_encode(json_encode($insert_data))]);
        }
    }
}
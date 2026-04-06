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
 * Class InsertDataToDB
 * This class is responsible for inserting data into the database for call events.
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class InsertDataToDB
{
    /*
     * Execute the insertion of data into the database.
     *
     * @param array $data The data to be inserted.
     * @param string $channel Channel data, additional filter.
     * @return void
     */
    public static function execute($data, string $channel = ''): void
    {
        if (empty($data['UNIQUEID'])) {
            SystemMessages::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
            return;
        }

        $is_new = false;
        $filter = [
            "UNIQUEID=:id: AND linkedid=:linkedid:",
            'bind' => [
                'id' => $data['UNIQUEID'],
                'linkedid' => $data['linkedid']
            ],
        ];
        if($channel !== ''){
            $filter[0].=  " AND (src_chan = :chan: OR dst_chan = :chan: )";
            $filter['bind']['chan'] = $channel;
        }
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if ($m_data === null) {
            // Create a new call record.
            $m_data = new CallDetailRecordsTmp();
            $is_new = true;
        } elseif (self::isOriginateDial($data)) {
            self::processingOriginateData($data, $m_data);
            // Further processing is not required.
            return;
        }

        self::fillCdrData($m_data, $data, $is_new);
    }

    /**
     * Check if the data represents an originate dial
     *
     * @param array $data The data to be checked
     * @return bool
     */
    private static function isOriginateDial(array $data): bool
    {
        return isset($data['IS_ORGNT']) && $data['IS_ORGNT'] !== false && $data['action'] === 'dial';
    }

    /**
     * Process the originate data. This package can come twice during dial.
     *
     * @param array $data The originate data.
     * @param CallDetailRecordsTmp $m_data The call detail records.
     *
     * @return void
     */
    private static function processingOriginateData(array $data, CallDetailRecordsTmp $m_data): void
    {
        if (empty($m_data->endtime)) {
            // If it's an originate dial, it can come twice.
            if (!empty($m_data->src_num) && $m_data->src_num === $data['dst_num']) {
                $m_data->dst_num = $data['src_num'];
                $m_data->save();
            }
        } else {
            // Previous calls are completed. The current call is new, for example, through a backup provider.
            // Change the identifier of the previous calls.
            $m_data->UNIQUEID .= Util::generateRandomString(5);
            // Clear the recording file path.
            $m_data->recordingfile = "";
            $m_data->save();

            $new_m_data = new CallDetailRecordsTmp();
            $new_m_data->UNIQUEID = $data['UNIQUEID'];
            $new_m_data->start = $data['start'];
            $new_m_data->src_chan = $m_data->src_chan;
            $new_m_data->src_num = $m_data->src_num;
            $new_m_data->dst_num = $data['src_num'];
            $new_m_data->did = $data['did'];
            $new_m_data->from_account = $data['from_account'];
            $new_m_data->linkedid = $data['linkedid'];
            $new_m_data->transfer = $data['transfer'];

            $res = $new_m_data->save();
            if (!$res) {
                SystemMessages::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
            }
        }
    }

    /**
     * Fill Call Detail Records data.
     *
     * @param CallDetailRecordsTmp $m_data The CallDetailRecordsTmp object to fill with data.
     * @param array $data The data to fill the CallDetailRecordsTmp object with.
     * @param bool $is_new Indicates whether it's a new record.
     * @return void
     */
    private static function fillCdrData(CallDetailRecordsTmp $m_data, array $data, bool $is_new): void
    {
        $f_list = $m_data->toArray();

        // Fill call history data.
        foreach ($data as $attribute => $value) {
            if (!array_key_exists($attribute, $f_list)) {
                continue;
            }

            // Skip filling UNIQUEID attribute if it's not a new record.
            if ($is_new === false && 'UNIQUEID' === $attribute) {
                continue;
            }
            $m_data->writeAttribute($attribute, $value);
        }
        $res = $m_data->save();
        if (!$res) {
            SystemMessages::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
        }
    }
}

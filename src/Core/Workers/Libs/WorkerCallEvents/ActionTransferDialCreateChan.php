<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

class ActionTransferDialCreateChan {
    /**
     * Обработка события создания канала - пары, при начале переадресации звонка.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $worker->addActiveChan($data['dst_chan']);
        $filter     = [
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
            ///
            // Проверим, если более одного канала SIP/256 при входящем.
            if ( ! empty($row->dst_chan) && $data['dst_chan'] !== $row->dst_chan) {
                if ($row_create) {
                    continue;
                }
                // Необходимо дублировать строку звонка.
                $new_row = new CallDetailRecordsTmp();
                $f_list  = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute('dst_chan', $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['transfer_UNIQUEID'] . '_' . $data['dst_chan']);
                // $new_row->save();
                // Подмена $row;
                $row        = $new_row;
                $row_create = true;
            }

            // конец проверки
            ///
            $row->writeAttribute('dst_chan',      $data['dst_chan']);
            if (isset($data['dst_call_id']) && ! empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_transfer_dial_create_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }
}
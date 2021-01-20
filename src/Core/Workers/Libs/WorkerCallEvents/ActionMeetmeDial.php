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
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionMeetmeDial
{
    /**
     * Событие входа в конференцкомнату.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $worker->StopMixMonitor($data['src_chan']);

        if (strpos($data['src_chan'], 'internal-originate') !== false) {
            // Уточним канал и ID записи;
            $filter = [
                'linkedid=:linkedid: AND src_num=:src_num:',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                    'src_num'  => $data['src_num'],
                ],
            ];
            /** @var CallDetailRecordsTmp $m_data */
            /** @var CallDetailRecordsTmp $row */
            $m_data = CallDetailRecordsTmp::findFirst($filter);
            if ($m_data !== null) {
                $data['src_chan'] = $m_data->src_chan;
                $m_data->UNIQUEID = $data['UNIQUEID'];

                $f_list = $m_data->toArray();
                foreach ($data as $attribute => $value) {
                    if ( ! array_key_exists($attribute, $f_list)) {
                        continue;
                    }
                    $m_data->writeAttribute($attribute, $value);
                }
                // Переопределяем идентификатор, это Originate на конференцию.
                $m_data->save();
            }
        } else {
            InsertDataToDB::execute($data);
            ActionAppEnd::execute($worker, $data);
        }
    }

}
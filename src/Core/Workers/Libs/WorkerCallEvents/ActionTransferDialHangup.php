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

class ActionTransferDialHangup
{
    /**
     * Завершение канала при прееадресации.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $pos = stripos($data['agi_channel'], 'local/');
        if ($pos === false) {
            // Обработка локального канала.
            self::fillLocalChannelCdr($worker, $data);
        } elseif ('' === $data['ANSWEREDTIME']) {
            self::fillNotAnsweredCdr($worker, $data);
        }
    }

    /**
     * Заполнение не отвеченного звонка.
     * @param $worker
     * @param $data
     */
    private static function fillNotAnsweredCdr($worker, $data):void{
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['TRANSFERERNAME'],
                'dst_chan' => $data['dst_chan'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Ответа не было. Переадресация отменена.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            if ( ! $row->save()) {
                Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }

        // Попробуем возобновить запись разговора.
        $filter = [
            'linkedid=:linkedid: AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $info      = pathinfo($row->recordingfile);
            $data_time = ($row->answer === '') ? $row->start : $row->answer;
            $subdir    = date('Y/m/d/H/', strtotime($data_time));
            $worker->MixMonitor($row->dst_chan, $info['filename'], $subdir);
            // Снимем со строк признак переадресации.
            $row->writeAttribute('transfer', 0);
            if ( ! $row->save()) {
                Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Обработка Local канала.
     * @param $worker
     * @param $data
     */
    private static function fillLocalChannelCdr($worker, $data):void{

        // Это НЕ локальный канал.
        // Если это завершение переадресации (консультативной). Создадим новую строку CDR.
        CreateRowTransfer::execute($worker, 'transfer_dial_hangup', $data);

        // Найдем записанные ранее строки.
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND (src_chan=:chan: OR dst_chan=:chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'chan'     => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Завершим вызов в CDR.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            if ( ! $row->save()) {
                Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
        // Попробуем возобновить запись разговора.
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND transfer=1',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $res */
        $res = CallDetailRecordsTmp::findFirst($filter);
        if ($res !== null) {
            $info      = pathinfo($res->recordingfile);
            $data_time = (empty($res->answer)) ? $res->start : $res->answer;
            $subdir    = date('Y/m/d/H/', strtotime($data_time));
            $worker->MixMonitor($res->dst_chan, $info['filename'], $subdir);
        }
    }

}
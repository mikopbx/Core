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

class ActionHangupChanMeetme
{
    /**
     * Завершение / уничтожение канала.
     * @param $worker
     * @param $data
     */
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        clearstatcache();
        $recordingfile = '';
        $dest_chan     = "MeetMe:{$data['conference']}";
        // Отбираем все строки по текущей конференции. Не завершенные вызовы.
        $filter = [
            'dst_chan=:dst_chan: OR linkedid=:linkedid:',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'dst_chan' => $dest_chan,
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        /** @var CallDetailRecordsTmp $row */
        foreach ($m_data as $row) {
            if ($dest_chan === $row->dst_chan) {
                $is_local        = (stripos($data['src_chan'], 'local/') !== false);
                $is_stored_local = (stripos($row->src_chan, 'local/') !== false);
                if ($row->UNIQUEID === $data['UNIQUEID'] && $is_local && ! $is_stored_local) {
                    $data['src_chan'] = $row->src_chan;
                }
                if (file_exists($row->recordingfile) || file_exists(
                        Util::trimExtensionForFile($row->recordingfile) . '.wav'
                    )) {
                    // Переопределим путь к файлу записи разговора. Для конферецнии файл один.
                    $recordingfile = $row->recordingfile;
                }
            }
            if ($row->linkedid === $data['meetme_id']) {
                continue;
            }
            // Подменим ID на идентификатор конференции.
            $row->writeAttribute('linkedid', $data['meetme_id']);
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }

        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        /** @var CallDetailRecordsTmp $rec_data */
        foreach ($m_data as $row) {
            if ($row->src_chan !== $data['src_chan']) {
                continue;
            }
            // Заполняем данные для текущего оповещения.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('linkedid', $data['meetme_id']);

            if ( ! empty($recordingfile)) {
                $row->writeAttribute('recordingfile', $recordingfile);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

}
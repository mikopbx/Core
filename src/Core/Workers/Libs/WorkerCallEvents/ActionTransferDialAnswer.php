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
 * Class ActionTransferDialAnswer
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionTransferDialAnswer
{
    /**
     * Executes the transfer dial answer action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $filter = [
            '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer = "" AND endtime = ""',
            'bind' => [
                'UNIQUEID' => $data['transfer_UNIQUEID'],
                'UNIQUEID_CHAN' => $data['transfer_UNIQUEID'] . '_' . $data['agi_channel'],
            ],
        ];

        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('answer', $data['answer']);
            $recFile = $data['recordingfile'] ?? '';
            if (!empty($recFile)) {
                $worker->mixMonitorChannels[$data['agi_channel']] = $recFile;
                $row->writeAttribute('recordingfile', $recFile);
            }
            $res = $row->save();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }
}
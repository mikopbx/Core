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
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionVoicemailEnd
 *
 * Handles the action of voicemail end.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionVoicemailEnd
{
    /**
     * Executes the action of voicemail end.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The event data.
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        $recordingFile = VoiceMailConf::getCopyFilename($data['vm-recordingfile'], $data['linkedid'], time(), false);
        $filter = [
            'linkedid=:linkedid: AND dst_num = "' . VoiceMailConf::VOICE_MAIL_EXT . '"',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('endtime', $data['endtime']);
            $row->writeAttribute('recordingfile', $recordingFile);
            $row->update();
        }
    }

}
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
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionHangupChanMeetme
 * Handles the termination/destruction of a channel in a MeetMe conference.
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionHangupChanMeetme
{
    /**
     * Executes the hangup channel action for a MeetMe conference.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param mixed $data The data containing call details.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        clearstatcache();
        $recordingfile = '';
        $dest_chan = "MeetMe:{$data['conference']}";
        // Retrieve all rows for the current conference that are not completed.
        $filter = [
            'dst_chan=:dst_chan: AND (linkedid=:linkedid: OR linkedid=:meetmeid:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'meetmeid' => $data['meetme_id'],
                'dst_chan' => $dest_chan,
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        /** @var CallDetailRecordsTmp $row */
        foreach ($m_data as $row) {
            if ($dest_chan === $row->dst_chan) {
                $is_local = (stripos($data['src_chan'], 'local/') !== false);
                $is_stored_local = (stripos($row->src_chan, 'local/') !== false);
                if ($row->UNIQUEID === $data['UNIQUEID'] && $is_local && !$is_stored_local) {
                    $data['src_chan'] = $row->src_chan;
                }
                if (file_exists($row->recordingfile) || file_exists(
                        Util::trimExtensionForFile($row->recordingfile) . '.wav'
                    )) {
                    // Override the recording file path. The conference has only one recording file.
                    $recordingfile = $row->recordingfile;
                }
            }
            if ($row->linkedid === $data['meetme_id']) {
                continue;
            }
            // Substitute the ID with the conference identifier.
            $row->writeAttribute('linkedid', $data['meetme_id']);
            $res = $row->save();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }

        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        /** @var CallDetailRecordsTmp $rec_data */
        foreach ($m_data as $row) {
            if ($row->src_chan !== $data['src_chan']) {
                continue;
            }
            // Fill in the data for the current notification.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('linkedid', $data['meetme_id']);

            if (!empty($recordingfile)) {
                $row->writeAttribute('recordingfile', $recordingfile);
            }
            $res = $row->save();
            if (!$res) {
                Util::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

}
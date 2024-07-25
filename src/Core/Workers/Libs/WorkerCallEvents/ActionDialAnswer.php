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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionDialAnswer
 * Handles the event of a phone call answer.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionDialAnswer
{
    private const NEED_CONTINUE = 1;
    private const NEED_BREAK = 2;
    private const NORM_EXIT = 0;


    /**
     * Handles the event of a phone call answer.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        // Retrieve the pickup extension number from the PBX settings.
        $pickupexten = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN);

        // Check if the dialed number (dnid) matches the pickup extension.
        if (trim($data['dnid']) === $pickupexten) {
            // If it matches, it means this is a call pickup event.
            // A call pickup event happens when we try to answer a call directed to another extension.
            self::fillPickUpCdr($worker, $data);
        } else {
            // If it doesn't match the pickup extension, it's a regular call, not a pickup.

            // Check if it's a Smart IVR call and perform necessary procedures.
            self::checkSmartIvrCalls($data);

            // Get the filter criteria for the current call data.
            $filter = self::getCallDataFilter($data);

            // Find the call detail records that match the filter.
            $m_data = CallDetailRecordsTmp::find($filter);

            // For each matching record...
            foreach ($m_data as $row) {
                // Fill the answered call detail records (CDR).
                $result = self::fillAnsweredCdr($worker, $data, $row);

                // If the result is NEED_BREAK, stop processing further records.
                if ($result === self::NEED_BREAK) {
                    break;
                }

                // If the result is NEED_CONTINUE, skip to the next record.
                if ($result === self::NEED_CONTINUE) {
                    continue;
                }
            }
        }
    }

    /**
     * Handles the PickUp call event.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @return void
     */
    private static function fillPickUpCdr($worker, $data): void
    {
        // This is a call pickup event.
        // It occurs when we try to answer a call directed to another extension.

        // Prepare filter criteria to find a record in CallDetailRecordsTmp with the original UNIQUEID.
        $filter = [
            'UNIQUEID=:UNIQUEID:',
            'bind' => ['UNIQUEID' => $data['old_id'],],
        ];

        // Find the call detail record with the original UNIQUEID.
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::find($filter);

        // Check if there is exactly one matching record.
        if (count($m_data->toArray()) === 1) {

            // If there is, retrieve the data from this record.
            /** @var CallDetailRecordsTmp $m_row_data */
            $m_row_data = $m_data[0];
            $new_data = $m_row_data->toArray();

            // Update certain fields in the new data.
            $new_data['start']    = $data['answer'];
            $new_data['answer']   = $data['answer'];
            $new_data['endtime']  = '';
            $new_data['dst_chan'] = $data['agi_channel'];
            $new_data['dst_num']  = $data['dst_num'];
            $new_data['UNIQUEID'] = $data['id'];

            // Check if call recording is enabled for this source and destination numbers.
            if ($worker->enableMonitor($new_data['src_num'] ?? '', $new_data['dst_num'] ?? '')) {
                // If it is, start recording the call.
                $new_data['recordingfile'] = $worker->MixMonitor($new_data['dst_chan'], 'pickup_' . $new_data['UNIQUEID'], '', '', 'fillPickUpCdr');
            }

            // Unset unnecessary fields from the new data.
            unset($new_data['id'], $new_data['end']);

            // Insert the new data into the database.
            InsertDataToDB::execute($new_data);

            // Create Asterisk Manager and send UserEvent.
            $new_data['action'] = 'answer_pickup_create_cdr';
            $AgiData = base64_encode(json_encode($new_data));
            $am = Util::getAstManager('off');
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
        }
    }

    /**
     * Checks parameters of a SmartIVR call.
     *
     * @param array $data Data related to the event.
     * @return void
     */
    private static function checkSmartIvrCalls($data): void
    {
        // If the 'ENDCALLONANSWER' field in the data array is empty, return without doing anything.
        if (empty($data['ENDCALLONANSWER'])) {
            return;
        }
        // The 'ENDCALLONANSWER' field is set when the smart routing begins.
        // Once a call is answered, we mark the call to the application as completed.

        // Prepare filter criteria to find a record in CallDetailRecordsTmp which has a different UNIQUEID,
        // is marked as an app call, has an empty 'endtime', and has a 'src_chan' matching the 'BRIDGEPEER'.
        $filter = [
            'UNIQUEID<>:UNIQUEID: AND is_app=1 AND endtime = "" AND src_chan=:src_chan:',
            'bind' => [
                'UNIQUEID' => $data['id'],
                'src_chan' => $data['BRIDGEPEER'],
            ],
        ];

        // Find the call detail records matching the filter.
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);

        // For each matching call detail record...
        foreach ($m_data as $row) {
            // ...set the 'endtime' to the answer time of the current call, ...
            $row->writeAttribute('endtime', $data['answer']);

            // ...and mark it as an application call.
            $row->writeAttribute('is_app', 1);

            // Try to save the changes. If saving failed, log the error messages.
            $res = $row->save();
            if (!$res) {
                SystemMessages::sysLogMsg('ENDCALLONANSWER', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Returns a filter for the current CDR (Call Detail Records).
     *
     * @param array $data Data related to the event.
     * @return array
     */
    private static function getCallDataFilter($data): array
    {
        // The 'org_id' field in the data array represents the original ID of a call.

        // If 'org_id' is set, this indicates that we may need to search using two IDs.
        // This is only applicable for Originate, when we use two channels as the caller -
        // mobile and internal number.

        // Prepare filter criteria to find a record in CallDetailRecordsTmp which either has a matching 'UNIQUEID'
        // or a matching 'org_id', and has both 'answer' and 'endtime' fields empty.
        if (isset($data['org_id'])) {
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID' => $data['id'],
                    'org_id' => $data['org_id'],
                ],
            ];
        } else {
            // If 'org_id' is not set, we search for a matching 'UNIQUEID' or a matching 'UNIQUEID_CHAN'
            // (composed of 'id' and 'agi_channel'), and has both 'answer' and 'endtime' fields empty.
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID' => $data['id'],
                    'UNIQUEID_CHAN' => $data['id'] . '_' . $data['agi_channel'],
                ],
            ];
        }

        return $filter;
    }

    /**
     * Fills information about the answered call.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @param object $row Current call record.
     * @return int
     */
    private static function fillAnsweredCdr($worker, $data, $row): int
    {
        // If the dialstatus of the call is 'ORIGINATE', special handling is needed.
        // This typically represents an outgoing call.
        if ($row->dialstatus === 'ORIGINATE') {

            // If the source channel (src_chan) of the call record does not match the channel from the data,
            // this isn't the call record we're looking for, so return NEED_CONTINUE to move on to the next record.
            if ($row->src_chan !== $data['agi_channel']) {
                return self::NEED_CONTINUE;
            }

            // Find all other Call Detail Records (CDR) related to this originate and mark them as completed.
            // The filter criteria include the 'linkedid' of the call and calls that have not been ended yet
            // and the source channel is not the current channel.
            $filter = [
                'linkedid=:linkedid: AND endtime <> "" AND src_chan <> :src_chan:',
                'bind' => [
                    'linkedid' => $row->linkedid,
                    'src_chan' => $data['agi_channel'],
                ],
            ];

            // Fetch all records that match the filter
            $m_orgn_data = CallDetailRecordsTmp::find($filter);

            // For each matching record, update the record's endtime, dst_chan and UNIQUEID.
            // Save each updated record back to the database.
            foreach ($m_orgn_data as $orgn_row) {
                if (empty($orgn_row->endtime)) {
                    $orgn_row->writeAttribute('endtime', $data['answer']);
                }

                $orgn_row->writeAttribute('dst_chan', '');
                $orgn_row->writeAttribute('UNIQUEID', $data['id'] . '_' . $orgn_row->src_chan);
                $orgn_row->update();
            }

            // Update the current row's dst_chan, dialstatus and UNIQUEID, then save it back to the database.
            $row->writeAttribute('dst_chan', '');
            $row->writeAttribute('dialstatus', '');
            $row->writeAttribute('UNIQUEID', $data['id']);
            $row->save();

            // Return NEED_BREAK to indicate that we have found and updated the correct record, and processing should stop.
            return self::NEED_BREAK;
        }

        // For other dialstatuses, simply update the answer time, recording file (if any) and save the record.
        // Return NORM_EXIT to indicate that processing can continue normally.
        $row->writeAttribute('answer', $data['answer']);
        $recFile = $data['recordingfile'] ?? '';
        if (!empty($recFile)) {
            $worker->mixMonitorChannels[$data['agi_channel']] = $recFile;
            $row->writeAttribute('recordingfile', $recFile);
        }
        $res = $row->save();
        if (!$res) {
            SystemMessages::sysLogMsg('Action_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
        }
        return self::NORM_EXIT;
    }
}
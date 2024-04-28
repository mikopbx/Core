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
 * Class ActionDialCreateChan
 *
 * This class handles the execution of creating a channel for a dial action.
 *
 *
 *  @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionDialCreateChan
{
    /**
     * Executes the creation of a channel for a dial action.
     *
     * @param WorkerCallEvents $worker The worker instance.
     * @param array $data The data containing call details.
     *
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, $data): void
    {
        // If the destination channel is not empty, add it to the active channels in the worker.
        $chan = $data['dst_chan'] ?? '';
        if (!empty($chan)) {
            $worker->addActiveChan($chan, $data['linkedid']);
        }

        // Get the filter conditions based on the data.
        $filter = self::getFilter($data);

        // Flag to check if a new record is created.
        $row_create = false;

        // Find all records that satisfy the filter conditions.
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */

        // Iterate over the records and process each one.
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Continue to the next iteration if the record is not an object.
            if (!is_object($row)) {
                continue;
            }

            // Check if there is more than one, i.e. SIP/256, channel for the incoming call.
            // Depending on the dialstatus, the channel to compare is either 'src_chan' or 'dst_chan'.
            $column_chan_name = ('ORIGINATE' === $row->dialstatus) ? 'src_chan' : 'dst_chan';

            // If a channel exists in the record and it doesn't match the destination channel from the data,
            // and if a new record hasn't been created yet, then a new record needs to be created.
            if (!empty($row->$column_chan_name) && $data['dst_chan'] !== $row->$column_chan_name) {
                if ($row_create) {
                    continue;
                }

                // Create a new call detail record and copy over the attributes from the current record.
                // Then, write the destination channel and unique ID into the new record.
                $new_row = new CallDetailRecordsTmp();
                $f_list = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute($column_chan_name, $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['UNIQUEID'] . '_' . $data['dst_chan']);

                // Replace the current record with the new one and set the row_create flag to true.
                $row = $new_row;
                $row_create = true;
            }  // END IF

            // If the dialstatus is 'ORIGINATE', then the source channel needs to be updated.
            // Otherwise, the destination channel needs to be updated.
            // Also, if the 'to_account' or 'dst_call_id' exists in the data, they are updated in the record as well.
            if ($row->dialstatus === 'ORIGINATE') {
                $account_col = 'from_account';
                $row->writeAttribute('src_chan', $data['dst_chan']);
            } else {
                $account_col = 'to_account';
                $row->writeAttribute('dst_chan', $data['dst_chan']);
            }

            if (isset($data['to_account']) && !empty($data['to_account'])) {
                $row->writeAttribute($account_col, $data['to_account']);
            }
            if (isset($data['dst_call_id']) && !empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }

            // Save the updated record. If saving fails, log the error message.
            $res = $row->save();
            if (!$res) {
                SystemMessages::sysLogMsg('Action_dial_create_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Generates a filter for querying Call Detail Records (CDRs) based on the provided data.
     *
     * @param array $data The data containing call details.
     *
     * @return array The filter array used for querying specific CDRs.
     */
    private static function getFilter(array $data): array
    {
        if (isset($data['org_id'])) {
            // In case 'org_id' is set, it's likely we need to search using two IDs.
            // This is applicable only for 'Originate', when we use two channels as the caller
            // (mobile and internal number).
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND endtime = ""',
                'bind' => ['UNIQUEID' => $data['UNIQUEID'], 'org_id' => $data['org_id'],],
            ];
        } else {
            // In all other cases, we use only 'UNIQUEID' to create our filter.
            $filter = [
                'UNIQUEID=:UNIQUEID: AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID' => $data['UNIQUEID'],
                ],
            ];
        }

        // Returns the filter array for CDR search.
        return $filter;
    }

    // checkMultipleRegistrations

}
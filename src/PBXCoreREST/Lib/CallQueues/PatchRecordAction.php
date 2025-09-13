<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction
 * Partially updates a call queue record (PATCH).
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class PatchRecordAction extends AbstractSaveRecordAction
{
    /**
     * Partially update a call queue record.
     *
     * @param array $data Partial call queue data to update
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate that ID is provided
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Call queue ID is required for patch';
                return $res;
            }
            
            // v3 API: ID is the uniqid value
            $queue = CallQueues::findFirst("uniqid='{$data['id']}'");
            
            if (!$queue) {
                $res->messages['error'][] = "Call queue not found: {$data['id']}";
                return $res;
            }
            
            // Get existing members if not provided in patch data
            $existingMembers = [];
            if (!isset($data['members'])) {
                $members = CallQueueMembers::find("queue='{$queue->uniqid}'");
                foreach ($members as $member) {
                    $existingMembers[] = [
                        'extension' => $member->extension,
                        'priority' => $member->priority
                    ];
                }
            }
            
            // Build full data array by merging existing with patch data
            // Use 'id' field with uniqid value for SaveRecordAction (v3 API)
            $fullData = [
                'id' => $queue->uniqid,
                'name' => $data['name'] ?? $queue->name,
                'extension' => $data['extension'] ?? $queue->extension,
                'strategy' => $data['strategy'] ?? $queue->strategy,
                'seconds_to_ring_each_member' => $data['seconds_to_ring_each_member'] ?? $queue->seconds_to_ring_each_member,
                'seconds_for_wrapup' => $data['seconds_for_wrapup'] ?? $queue->seconds_for_wrapup,
                'recive_calls_while_on_a_call' => $data['recive_calls_while_on_a_call'] ?? $queue->recive_calls_while_on_a_call,
                'announce_position' => $data['announce_position'] ?? $queue->announce_position,
                'announce_hold_time' => $data['announce_hold_time'] ?? $queue->announce_hold_time,
                'periodic_announce_sound_id' => $data['periodic_announce_sound_id'] ?? $queue->periodic_announce_sound_id,
                'periodic_announce_frequency' => $data['periodic_announce_frequency'] ?? $queue->periodic_announce_frequency,
                'timeout_to_redirect_to_extension' => $data['timeout_to_redirect_to_extension'] ?? $queue->timeout_to_redirect_to_extension,
                'timeout_extension' => $data['timeout_extension'] ?? $queue->timeout_extension,
                'redirect_to_extension_if_empty' => $data['redirect_to_extension_if_empty'] ?? $queue->redirect_to_extension_if_empty,
                'redirect_to_extension_if_unanswered' => $data['redirect_to_extension_if_unanswered'] ?? $queue->redirect_to_extension_if_unanswered,
                'redirect_to_extension_if_repeat_exceeded' => $data['redirect_to_extension_if_repeat_exceeded'] ?? $queue->redirect_to_extension_if_repeat_exceeded,
                'number_unanswered_calls_to_redirect' => $data['number_unanswered_calls_to_redirect'] ?? $queue->number_unanswered_calls_to_redirect,
                'number_repeat_unanswered_to_redirect' => $data['number_repeat_unanswered_to_redirect'] ?? $queue->number_repeat_unanswered_to_redirect,
                'callerid_prefix' => $data['callerid_prefix'] ?? $queue->callerid_prefix,
                'moh_sound_id' => $data['moh_sound_id'] ?? $queue->moh_sound_id,
                'caller_hear' => $data['caller_hear'] ?? $queue->caller_hear,
                'description' => $data['description'] ?? $queue->description,
                'members' => $data['members'] ?? $existingMembers
            ];
            
            // Use existing SaveRecordAction logic for actual update
            $res = SaveRecordAction::main($fullData);
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
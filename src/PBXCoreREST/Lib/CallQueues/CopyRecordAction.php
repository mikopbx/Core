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
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying a call queue with automatic extension assignment
 *
 * This action creates a copy of an existing call queue with:
 * - New unique ID generated automatically
 * - Next available extension number assigned
 * - Name prefixed with "copy of"
 * - All settings and members copied
 *
 * @api {get} /pbxcore/api/v3/call-queues/{id}:copy Copy call queue
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup CallQueues
 *
 * @apiParam {String} id Source call queue ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied call queue data ready for creation
 * @apiSuccess {String} data.id New unique identifier
 * @apiSuccess {String} data.extension New extension number (automatically assigned)
 * @apiSuccess {String} data.name Name prefixed with "copy of"
 * @apiSuccess {Array} data.members Copied queue members
 */
class CopyRecordAction
{
    /**
     * Copy call queue record with new extension and ID
     *
     * @param string $sourceId Source queue ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source queue
            $sourceQueue = CallQueues::findFirst("uniqid='{$sourceId}'");

            if (!$sourceQueue) {
                $res->messages['error'][] = "Source call queue not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source queue not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create new queue model with copied values
            $newQueue = self::createCopyFromSource($sourceQueue);

            // Get source queue members
            $sourceMembers = CallQueueMembers::find([
                'conditions' => 'queue = :queue:',
                'bind' => ['queue' => $sourceQueue->uniqid],
                'order' => 'priority ASC'
            ]);

            // Prepare members array for the copy
            $membersArray = [];
            foreach ($sourceMembers as $member) {
                $memberExt = Extensions::findFirstByNumber($member->extension);
                $membersArray[] = [
                    'id' => '', // Clear ID for new record
                    'extension' => $member->extension,
                    'priority' => (int)$member->priority,
                    'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                ];
            }

            // Create data structure for the copied queue
            $res->data = DataStructure::createFromModel($newQueue, $membersArray);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying call queue: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of CallQueue from source record
     *
     * @param CallQueues $sourceQueue
     * @return CallQueues
     */
    private static function createCopyFromSource(CallQueues $sourceQueue): CallQueues
    {
        $newQueue = new CallQueues();

        // Generate new identifiers
        $newQueue->id = '';
        $newQueue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');

        // Get new extension number automatically
        $newQueue->extension = Extensions::getNextFreeApplicationNumber();

        // Copy all other fields
        $newQueue->name = 'copy of ' . $sourceQueue->name;
        $newQueue->strategy = $sourceQueue->strategy;
        $newQueue->seconds_to_ring_each_member = $sourceQueue->seconds_to_ring_each_member;
        $newQueue->seconds_for_wrapup = $sourceQueue->seconds_for_wrapup;
        $newQueue->recive_calls_while_on_a_call = $sourceQueue->recive_calls_while_on_a_call;
        $newQueue->caller_hear = $sourceQueue->caller_hear;
        $newQueue->announce_position = $sourceQueue->announce_position;
        $newQueue->announce_hold_time = $sourceQueue->announce_hold_time;
        $newQueue->periodic_announce_sound_id = $sourceQueue->periodic_announce_sound_id;
        $newQueue->moh_sound_id = $sourceQueue->moh_sound_id;
        $newQueue->periodic_announce_frequency = $sourceQueue->periodic_announce_frequency;
        $newQueue->timeout_to_redirect_to_extension = $sourceQueue->timeout_to_redirect_to_extension;
        $newQueue->timeout_extension = $sourceQueue->timeout_extension;
        $newQueue->redirect_to_extension_if_empty = $sourceQueue->redirect_to_extension_if_empty;
        $newQueue->number_unanswered_calls_to_redirect = $sourceQueue->number_unanswered_calls_to_redirect;
        $newQueue->redirect_to_extension_if_unanswered = $sourceQueue->redirect_to_extension_if_unanswered;
        $newQueue->number_repeat_unanswered_to_redirect = $sourceQueue->number_repeat_unanswered_to_redirect;
        $newQueue->redirect_to_extension_if_repeat_exceeded = $sourceQueue->redirect_to_extension_if_repeat_exceeded;
        $newQueue->callerid_prefix = $sourceQueue->callerid_prefix;
        $newQueue->description = $sourceQueue->description;

        return $newQueue;
    }
}
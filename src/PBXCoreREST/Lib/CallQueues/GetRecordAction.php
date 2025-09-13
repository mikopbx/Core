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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting call queue record with extension representations
 *
 * @api {get} /pbxcore/api/v2/call-queues/getRecord/:id Get call queue record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup CallQueues
 *
 * @apiParam {String} [id] Record ID, "new" for new record structure, or "copy-{id}" for copy mode
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Call queue data with representation fields
 * @apiSuccess {String} data.timeout_extension Timeout extension number
 * @apiSuccess {String} data.timeout_extensionRepresent Timeout extension representation with icons
 * @apiSuccess {String} data.periodic_announce_sound_idRepresent Sound file representation
 * @apiSuccess {Array} data.members Array of queue members with representations
 * @apiSuccess {String} data.members.represent Member extension representation with icons
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get call queue record with all representation fields for dropdowns
     * Supports copy mode with "copy-{sourceId}" format
     *
     * @param string|null $id Record ID (uniqid value), null/"new" for new record, or "copy-{sourceId}" for copy mode
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Check for copy mode
        $copyMode = false;
        $sourceId = '';
        if (!empty($id) && strpos($id, 'copy-') === 0) {
            $copyMode = true;
            $sourceId = substr($id, 5); // Remove 'copy-' prefix
        }

        if (empty($id) || $id === 'new' || $copyMode) {
            if ($copyMode && !empty($sourceId)) {
                // Copy mode - load source record and modify it
                // v3 API: ID is the uniqid value
                $sourceQueue = CallQueues::findFirst("uniqid='{$sourceId}'");
                
                if ($sourceQueue) {
                    // Create copy of the source queue
                    $newQueue = self::createCopyFromSource($sourceQueue);
                    
                    // Get source queue members for copying
                    $sourceMembers = CallQueueMembers::find([
                        'conditions' => 'queue = :queue:',
                        'bind' => ['queue' => $sourceQueue->uniqid],
                        'order' => 'priority ASC'
                    ]);

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

                    $res->data = DataStructure::createFromModel($newQueue, $membersArray);
                    $res->success = true;

                    SystemMessages::sysLogMsg(__METHOD__,
                        "Call queue copied from '{$sourceQueue->name}' to '{$newQueue->name}'",
                        LOG_DEBUG
                    );
                } else {
                    // Fallback to new record if source not found
                    $newQueue = self::createNewRecord();
                    $res->data = DataStructure::createFromModel($newQueue, []);
                    $res->success = true;
                    
                    SystemMessages::sysLogMsg(__METHOD__,
                        "Source queue not found for copy, created new record instead",
                        LOG_WARNING
                    );
                }
            } else {
                // Create structure for new record with default values
                $newQueue = self::createNewRecord();
                $res->data = DataStructure::createFromModel($newQueue, []);
                $res->success = true;

                SystemMessages::sysLogMsg(__METHOD__,
                    "New call queue structure generated",
                    LOG_DEBUG
                );
            }
        } else {
            // Find existing record
            // v3 API: ID is the uniqid value
            $queue = CallQueues::findFirst("uniqid='{$id}'");

            if ($queue) {
                // Get queue members with their representations
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid],
                    'order' => 'priority ASC'
                ]);

                $membersArray = [];
                foreach ($members as $member) {
                    $memberExt = Extensions::findFirstByNumber($member->extension);
                    $membersArray[] = [
                        'id' => (string)$member->id,
                        'extension' => $member->extension,
                        'priority' => (int)$member->priority,
                        'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                    ];
                }

                $res->data = DataStructure::createFromModel($queue, $membersArray);
                $res->success = true;

                SystemMessages::sysLogMsg(__METHOD__,
                    "Call queue '{$queue->name}' ({$queue->extension}) loaded successfully",
                    LOG_DEBUG
                );
            } else {
                $res->messages['error'][] = 'Call queue not found';
                SystemMessages::sysLogMsg(__METHOD__,
                    "Call queue not found: {$id}",
                    LOG_WARNING
                );
            }
        }

        return $res;
    }

    /**
     * Create new CallQueue record with default values
     * 
     * @return CallQueues
     */
    private static function createNewRecord(): CallQueues
    {
        $newQueue = new CallQueues();
        $newQueue->id = '';
        $newQueue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
        $newQueue->extension = Extensions::getNextFreeApplicationNumber();
        $newQueue->name = '';
        $newQueue->strategy = 'ringall';
        $newQueue->seconds_to_ring_each_member = '15';
        $newQueue->seconds_for_wrapup = '15';
        $newQueue->recive_calls_while_on_a_call = '0'; // Will be converted to boolean false in DataStructure (unchecked by default)
        $newQueue->caller_hear = 'ringing';
        $newQueue->announce_position = '0'; // Will be converted to boolean false in DataStructure (unchecked by default)
        $newQueue->announce_hold_time = '0'; // Will be converted to boolean false in DataStructure (unchecked by default)
        $newQueue->periodic_announce_frequency = '0';
        $newQueue->timeout_to_redirect_to_extension = '300';
        $newQueue->timeout_extension = '';
        $newQueue->redirect_to_extension_if_empty = '';
        $newQueue->number_unanswered_calls_to_redirect = '3';
        $newQueue->redirect_to_extension_if_unanswered = '';
        $newQueue->number_repeat_unanswered_to_redirect = '3';
        $newQueue->redirect_to_extension_if_repeat_exceeded = '';
        $newQueue->callerid_prefix = '';
        $newQueue->description = '';
        
        return $newQueue;
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
        
        // Clear identifiers
        $newQueue->id = '';
        $newQueue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
        
        // Get new extension number
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
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

/**
 * Action for getting call queue record with extension representations
 *
 * @api {get} /pbxcore/api/v2/call-queues/getRecord/:id Get call queue record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup CallQueues
 *
 * @apiParam {String} [id] Record ID or "new" for new record structure
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Call queue data with representation fields
 * @apiSuccess {String} data.timeout_extension Timeout extension number
 * @apiSuccess {String} data.timeout_extensionRepresent Timeout extension representation with icons
 * @apiSuccess {String} data.periodic_announce_sound_idRepresent Sound file representation
 * @apiSuccess {Array} data.members Array of queue members with representations
 * @apiSuccess {String} data.members.represent Member extension representation with icons
 */
class GetRecordAction
{
    /**
     * Get call queue record with all representation fields for dropdowns
     *
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id) || $id === 'new') {
            // Create structure for new record with default values
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

            $res->data = DataStructure::createFromModel($newQueue, []);
            $res->success = true;

            SystemMessages::sysLogMsg(__METHOD__,
                "New call queue structure generated",
                LOG_DEBUG
            );
        } else {
            // Find existing record
            $queue = CallQueues::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);

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
}
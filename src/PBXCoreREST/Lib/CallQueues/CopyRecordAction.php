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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractCopyRecordAction;

/**
 * Action for copying a call queue with automatic extension assignment
 *
 * Extends AbstractCopyRecordAction to leverage:
 * - Automatic unique ID generation
 * - Next available extension number assignment
 * - Name prefixed with "copy of"
 * - Related records copying (queue members)
 * - Consistent error handling and logging
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
class CopyRecordAction extends AbstractCopyRecordAction
{
    /**
     * Copy call queue record with new extension and ID
     *
     * @param string $sourceId Source queue ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        return self::executeStandardCopy(
            $sourceId,
            CallQueues::class,
            DataStructure::class,
            Extensions::TYPE_QUEUE.'-',  // Unique ID prefix
            [                            // Fields to copy
                'name',
                'strategy',
                'seconds_to_ring_each_member',
                'seconds_for_wrapup',
                'recive_calls_while_on_a_call',
                'caller_hear',
                'announce_position',
                'announce_hold_time',
                'periodic_announce_sound_id',
                'moh_sound_id',
                'periodic_announce_frequency',
                'timeout_to_redirect_to_extension',
                'timeout_extension',
                'redirect_to_extension_if_empty',
                'number_unanswered_calls_to_redirect',
                'redirect_to_extension_if_unanswered',
                'number_repeat_unanswered_to_redirect',
                'redirect_to_extension_if_repeat_exceeded',
                'callerid_prefix',
                'description'
            ],
            true,                          // Needs extension
            self::createRelatedRecordsCallback(),  // Copy queue members
            'Call queue'                  // Entity type for messages
        );
    }

    /**
     * Create callback for copying related queue members
     *
     * @return callable
     */
    private static function createRelatedRecordsCallback(): callable
    {
        return function ($sourceQueue, $newQueue) {
            // Find source queue members
            /** @var \Phalcon\Mvc\Model\Resultset\Simple $sourceMembers */
            $sourceMembers = CallQueueMembers::find([
                'conditions' => 'queue = :queue:',
                'bind' => ['queue' => $sourceQueue->uniqid],
                'order' => 'priority ASC'
            ]);

            // Convert to array format for DataStructure
            $membersArray = [];
            /** @var \MikoPBX\Common\Models\CallQueueMembers $member */
            foreach ($sourceMembers as $member) {
                $memberExt = Extensions::findFirstByNumber($member->extension);
                $membersArray[] = [
                    'id' => '', // Clear ID for new record
                    'extension' => $member->extension,
                    'priority' => (int)$member->priority,
                    'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                ];
            }

            // Return members array to be passed to DataStructure::createFromModel
            return $membersArray;
        };
    }
}
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
 * @api {get} /pbxcore/api/v3/call-queues/:id Get call queue record
 * @apiVersion 3.0.0
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
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get call queue record with all representation fields for dropdowns
     *
     * @param string|null $id Record ID (uniqid value) or null/"new" for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id) || $id === 'new') {
            // Create default data structure from OpenAPI schema
            // For backward compatibility with "new" ID parameter
            // Note: Prefer using GetDefaultAction (:getDefault endpoint) for new records
            $uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
            $extensionNumber = Extensions::getNextFreeApplicationNumber();

            $res->data = DataStructure::createFromSchema('detail', [
                'id' => $uniqid,
                'extension' => $extensionNumber,
                'isNew' => '1',
                'members' => []
            ]);
            $res->success = true;
        } else {
            // Find existing record
            // v3 API: ID is the uniqid value
            $queue = CallQueues::findFirst("uniqid='{$id}'");

            if ($queue) {
                // Get queue members with their representations
                /** @var \Phalcon\Mvc\Model\Resultset\Simple $members */
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid],
                    'order' => 'priority ASC'
                ]);

                $membersArray = [];
                /** @var CallQueueMembers $member */
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
            } else {
                $res->messages['error'][] = 'Call queue not found';
                $res->httpCode = 404; // Not Found
                SystemMessages::sysLogMsg(__METHOD__,
                    "Call queue not found: {$id}",
                    LOG_WARNING
                );
            }
        }

        return $res;
    }

}
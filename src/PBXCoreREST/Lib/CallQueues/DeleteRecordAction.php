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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting call queue record
 *
 * Extends AbstractDeleteAction to leverage:
 * - Standard record lookup with uniqid/id fallback
 * - Transaction-based deletion
 * - Extension cleanup
 * - Consistent error handling and logging
 *
 * @api {delete} /pbxcore/api/v2/call-queues/deleteRecord/:id Delete call queue
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup CallQueues
 *
 * @apiParam {String} id Record ID to delete
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete call queue record with related data cleanup
     *
     * @param string $id Record ID to delete (uniqid value for v3 API)
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        return self::executeStandardDelete(
            CallQueues::class,
            $id,
            'Call queue',
            'Call queue not found',
            function($queue) {
                // Delete related queue members before deleting the queue
                /** @var \Phalcon\Mvc\Model\Resultset\Simple $members */
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid]
                ]);

                /** @var CallQueueMembers $member */
                foreach ($members as $member) {
                    if (!$member->delete()) {
                        throw new \Exception('Failed to delete queue member: ' . implode(', ', $member->getMessages()));
                    }
                }
            }
        );
    }
}
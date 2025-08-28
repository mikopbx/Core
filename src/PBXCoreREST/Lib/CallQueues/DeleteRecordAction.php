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
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for deleting call queue record
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
class DeleteRecordAction
{
    /**
     * Delete call queue record with proper logging
     *
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            SystemMessages::sysLogMsg(__METHOD__,
                'Delete attempt with empty ID',
                LOG_ERR
            );
            return $res;
        }

        try {
            // Find record by uniqid or id
            $queue = CallQueues::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);

            if (!$queue) {
                $res->messages['error'][] = 'Call queue not found';
                SystemMessages::sysLogMsg(__METHOD__,
                    "Queue not found for deletion: {$id}",
                    LOG_WARNING
                );
                return $res;
            }

            $queueName = $queue->name;
            $queueExtension = $queue->extension;

            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($queue) {
                // Delete related queue members
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid]
                ]);
                foreach ($members as $member) {
                    if (!$member->delete()) {
                        throw new \Exception('Failed to delete queue member: ' . implode(', ', $member->getMessages()));
                    }
                }

                // Delete related extension
                $extension = Extensions::findFirstByNumber($queue->extension);
                if ($extension) {
                    if (!$extension->delete()) {
                        // Get the error messages
                        $messages = $extension->getMessages();
                        $errorMessage = implode(', ', $messages);
                        
                        // If the error message contains HTML (constraint violation with links),
                        // don't add a prefix as it already has proper formatting
                        if (strpos($errorMessage, '<div class="ui header">') !== false) {
                            throw new \Exception($errorMessage);
                        } else {
                            // For simple error messages, add the prefix
                            throw new \Exception('Failed to delete extension: ' . $errorMessage);
                        }
                    }
                }

                // Delete call queue itself
                if (!$queue->delete()) {
                    throw new \Exception('Failed to delete call queue: ' . implode(', ', $queue->getMessages()));
                }

                return true;
            });

            $res->success = true;
            $res->data = ['deleted_id' => $id];

            // Log successful deletion (following MikoPBX standards)
            SystemMessages::sysLogMsg(__METHOD__,
                "Call queue '{$queueName}' ({$queueExtension}) deleted successfully",
                LOG_INFO
            );

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            // Use CriticalErrorsHandler for exceptions (following MikoPBX standards)
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        return $res;
    }
}
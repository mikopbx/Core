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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for getting list of all call queue records
 * 
 * @api {get} /pbxcore/api/v2/call-queues/getList Get all call queue records
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup DialplanApplications
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of call queue records
 */
class GetListAction
{
    /**
     * Get list of all call queues with member representations
     *
     * @param array $data Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $queues = CallQueues::find(['order' => 'name ASC']);

            // Pre-load all queue members to avoid N+1 queries
            $queueIds = [];
            foreach ($queues as $queue) {
                $queueIds[] = $queue->uniqid;
            }

            // Load all members in one query
            $membersByQueue = [];
            if (!empty($queueIds)) {
                $allMembers = \MikoPBX\Common\Models\CallQueueMembers::find([
                    'conditions' => 'queue IN ({queue:array})',
                    'bind' => ['queue' => $queueIds],
                    'order' => 'priority ASC'
                ]);

                // Group members by queue
                foreach ($allMembers as $member) {
                    if (!isset($membersByQueue[$member->queue])) {
                        $membersByQueue[$member->queue] = [];
                    }
                    $membersByQueue[$member->queue][] = $member;
                }
            }

            $queuesList = [];
            foreach ($queues as $queue) {
                $members = $membersByQueue[$queue->uniqid] ?? [];
                $queuesList[] = DataStructure::createForList($queue, $members);
            }

            $res->data = $queuesList;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        return $res;
    }
}
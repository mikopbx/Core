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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all call queue records
 *
 * Extends AbstractGetListAction to leverage:
 * - Standard list retrieval patterns
 * - Search functionality
 * - Ordering support
 * - Pagination support
 * - Consistent error handling
 *
 * @api {get} /pbxcore/api/v2/call-queues/getList Get all call queue records
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup CallQueues
 *
 * @apiParam {String} [search] Search term for filtering by name
 * @apiParam {String} [order] Field to order by (name, extension, id)
 * @apiParam {String} [orderWay] Order direction (ASC/DESC)
 * @apiParam {Number} [limit] Maximum number of records to return
 * @apiParam {Number} [offset] Number of records to skip
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of call queue records
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all call queues with member representations
     *
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Use executeStandardList but with a custom callback to handle members
        return self::executeStandardListWithRelations(
            $data,
            CallQueues::class,
            DataStructure::class
        );
    }

    /**
     * Execute standard list with related queue members
     *
     * Custom implementation to pre-load queue members and avoid N+1 queries
     *
     * @param array $requestParams Request parameters
     * @param string $modelClass Model class name
     * @param string $dataStructureClass DataStructure class name
     * @return PBXApiResult
     */
    private static function executeStandardListWithRelations(
        array $requestParams,
        string $modelClass,
        string $dataStructureClass
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createListResult($caller);

        try {
            $queryOptions = [];

            // Apply search filters
            $queryOptions = self::applySearchFilters(
                $queryOptions,
                $requestParams,
                ['name', 'description']
            );

            // Apply ordering
            $queryOptions = self::applyOrdering(
                $queryOptions,
                $requestParams,
                ['name', 'extension', 'id'],
                'name ASC'
            );

            // Apply pagination if requested
            if (isset($requestParams['limit']) || isset($requestParams['offset'])) {
                $queryOptions = self::applyPagination($queryOptions, $requestParams);
            }

            // Get queues
            $queues = $modelClass::find($queryOptions);

            // Pre-load all queue members to avoid N+1 queries
            $queueIds = [];
            foreach ($queues as $queue) {
                $queueIds[] = $queue->uniqid;
            }

            // Load all members in one query
            $membersByQueue = [];
            if (!empty($queueIds)) {
                $allMembers = CallQueueMembers::find([
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

            // Build result with members
            $resultData = [];
            foreach ($queues as $queue) {
                $members = $membersByQueue[$queue->uniqid] ?? [];
                $resultData[] = $dataStructureClass::createForList($queue, $members);
            }

            $res->data = $resultData;
            $res->success = true;

        } catch (\Exception $e) {
            return self::handleListError($e, $res);
        }

        return $res;
    }
}
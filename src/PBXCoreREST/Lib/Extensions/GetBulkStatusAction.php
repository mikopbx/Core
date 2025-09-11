<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Action for getting bulk extensions creation status
 * 
 * @api {get} /pbxcore/api/extensions/getBulkStatus/{processId} Get bulk process status
 * @apiVersion 2.0.0
 * @apiName GetBulkStatus
 * @apiGroup Extensions
 * 
 * @apiParam {String} processId Process identifier
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Status data
 * @apiSuccess {String} data.status Process status: "started", "processing", "completed", "failed"
 * @apiSuccess {Number} data.progress Current progress (0-100)
 * @apiSuccess {Number} data.processed Number of processed records
 * @apiSuccess {Number} data.total Total number of records
 * @apiSuccess {Number} data.created Number of created extensions
 * @apiSuccess {Number} data.skipped Number of skipped records
 * @apiSuccess {Number} data.errors Number of error records
 * @apiSuccess {String} [data.current_item] Currently processing item
 * @apiSuccess {Number} [data.eta] Estimated time remaining in seconds
 */
class GetBulkStatusAction extends Injectable
{
    /**
     * Get bulk process status by process ID
     * 
     * @param string $processId Process identifier
     * @return PBXApiResult
     */
    public static function main(string $processId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = Di::getDefault();
        if ($di === null) {
            $res->success = false;
            $res->messages['error'] = 'Dependency injector not initialized';
            return $res;
        }

        // Validate process ID
        if (empty($processId)) {
            $res->success = false;
            $res->messages['error'] = 'Process ID is required';
            return $res;
        }

        // Sanitize process ID (security)
        if (!preg_match('/^bulk_ext_[a-f0-9]+\.[0-9]+$/', $processId)) {
            $res->success = false;
            $res->messages['error'] = 'Invalid process ID format';
            return $res;
        }

        $redis = $di->getShared('redis');
        if (!$redis) {
            $res->success = false;
            $res->messages['error'] = 'Redis connection not available';
            return $res;
        }

        // Get process status from Redis
        $statusKey = "bulk_extensions:$processId";
        $statusData = $redis->get($statusKey);
        
        if ($statusData === false) {
            // Process not found or expired
            $res->success = false;
            $res->messages['error'] = 'Process not found or expired';
            return $res;
        }

        $status = json_decode($statusData, true);
        if ($status === null) {
            $res->success = false;
            $res->messages['error'] = 'Invalid status data';
            return $res;
        }

        // Calculate additional metrics
        $processed = $status['processed'] ?? 0;
        $total = $status['total'] ?? 0;
        $startedAt = $status['started_at'] ?? time();
        $currentTime = time();
        $elapsedTime = $currentTime - $startedAt;

        // Calculate progress percentage
        $progress = $total > 0 ? round(($processed / $total) * 100, 1) : 0;

        // Estimate time remaining (ETA)
        $eta = null;
        if ($processed > 0 && $total > $processed && $elapsedTime > 0) {
            $avgTimePerItem = $elapsedTime / $processed;
            $remainingItems = $total - $processed;
            $eta = round($remainingItems * $avgTimePerItem);
        }

        // Prepare response data
        $responseData = [
            'id' => $processId,
            'status' => $status['status'] ?? 'unknown',
            'mode' => $status['mode'] ?? 'unknown',
            'progress' => $progress,
            'processed' => $processed,
            'total' => $total,
            'created' => $status['created'] ?? 0,
            'skipped' => $status['skipped'] ?? 0,
            'errors' => $status['errors'] ?? 0,
            'started_at' => $startedAt,
            'elapsed_time' => $elapsedTime,
        ];

        // Add optional fields if available
        if (isset($status['current_item'])) {
            $responseData['current_item'] = $status['current_item'];
        }

        if ($eta !== null) {
            $responseData['eta'] = $eta;
        }

        if (isset($status['error_message'])) {
            $responseData['error_message'] = $status['error_message'];
        }

        if (isset($status['completed_at'])) {
            $responseData['completed_at'] = $status['completed_at'];
            $responseData['total_time'] = $status['completed_at'] - $startedAt;
        }

        if (isset($status['report'])) {
            $responseData['report'] = $status['report'];
        }

        $res->success = true;
        $res->data = $responseData;

        return $res;
    }

    /**
     * Cancel bulk process
     * 
     * @param string $processId Process identifier
     * @return PBXApiResult
     */
    public static function cancel(string $processId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = Di::getDefault();
        if ($di === null) {
            $res->success = false;
            $res->messages['error'] = 'Dependency injector not initialized';
            return $res;
        }

        // Validate process ID
        if (empty($processId) || !preg_match('/^bulk_ext_[a-f0-9]+\.[0-9]+$/', $processId)) {
            $res->success = false;
            $res->messages['error'] = 'Invalid process ID';
            return $res;
        }

        $redis = $di->getShared('redis');
        if (!$redis) {
            $res->success = false;
            $res->messages['error'] = 'Redis connection not available';
            return $res;
        }

        // Set cancellation flag
        $cancelKey = "bulk_extensions:cancel:$processId";
        $redis->setex($cancelKey, 300, '1'); // 5 minutes expiry

        $res->success = true;
        $res->messages['info'] = 'Cancellation request sent';

        return $res;
    }
}
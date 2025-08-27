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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for changing priority of out-of-work-time conditions
 * 
 * Handles bulk priority updates for drag-and-drop reordering.
 * 
 * @api {post} /pbxcore/api/v2/out-work-times/changePriority Change out-of-work times priority
 * @apiVersion 2.0.0
 * @apiName ChangePriority
 * @apiGroup OutWorkTimes
 * 
 * @apiParam {Object} priorities Map of condition ID to new priority value
 * @apiParamExample {json} Request-Example:
 *     {
 *       "priorities": {
 *         "2": 10,
 *         "3": 20,
 *         "4": 30
 *       }
 *     }
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Operation details
 */
class ChangePriorityAction extends AbstractSaveRecordAction
{
    /**
     * Update priorities for multiple time conditions
     * 
     * @param array $data Request data with priorities map
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        // Extract priorities from request data (similar to IncomingRoutes)
        $priorities = $data['priorities'] ?? $data;
        
        if (empty($priorities) || !is_array($priorities)) {
            $res->messages['error'][] = 'api_InvalidPrioritiesData';
            return $res;
        }

        try {
            return self::updatePrioritiesInTransaction($priorities, $res);
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }
    }
    
    /**
     * Update priorities within a database transaction
     * 
     * @param array $priorities Map of condition ID to priority
     * @param PBXApiResult $res Result object to populate
     * @return PBXApiResult
     * @throws \Exception
     */
    private static function updatePrioritiesInTransaction(array $priorities, PBXApiResult $res): PBXApiResult
    {
        $result = self::executeInTransaction(function() use ($priorities) {
            $updatedCount = 0;
            $errors = [];
            
            foreach ($priorities as $conditionId => $newPriority) {
                $result = self::updateSingleConditionPriority((string)$conditionId, (int)$newPriority);
                
                if ($result['success']) {
                    $updatedCount++;
                } elseif ($result['error']) {
                    $errors[] = $result['error'];
                }
            }
            
            if (!empty($errors)) {
                throw new \Exception(implode('; ', $errors));
            }
            
            return $updatedCount;
        });
        
        $res->success = true;
        $res->data = [
            'updated' => $result,
            'message' => "Successfully updated {$result} time condition priorities"
        ];
        
        // Log successful operation
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Successfully updated {$result} time condition priorities",
            LOG_INFO
        );
        
        return $res;
    }
    
    /**
     * Update priority for a single time condition
     * 
     * @param string $conditionId Condition ID to update
     * @param int $newPriority New priority value
     * @return array Result with 'success' boolean and optional 'error' message
     */
    private static function updateSingleConditionPriority(string $conditionId, int $newPriority): array
    {
        $condition = OutWorkTimes::findFirstById($conditionId);
        
        if (!$condition) {
            return ['success' => false, 'error' => "Time condition ID {$conditionId} not found"];
        }
        
        // Only update if priority changed
        if ((int)$condition->priority !== $newPriority) {
            $oldPriority = $condition->priority;
            $condition->priority = (string)$newPriority;
            
            if (!$condition->save()) {
                $errorMessage = implode(', ', $condition->getMessages());
                return ['success' => false, 'error' => "Failed to update condition ID {$conditionId}: {$errorMessage}"];
            }
            
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Updated priority for '{$condition->description}' from {$oldPriority} to {$newPriority}",
                LOG_DEBUG
            );
        }
        
        return ['success' => true, 'error' => null];
    }
}
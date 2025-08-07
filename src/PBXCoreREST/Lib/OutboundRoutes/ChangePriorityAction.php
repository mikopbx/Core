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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for changing priority of outbound routes
 * 
 * @api {post} /pbxcore/api/v2/outbound-routes/changePriority Change outbound routes priority
 * @apiVersion 2.0.0
 * @apiName ChangePriority
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {Object} priorities Map of route ID to new priority value
 * @apiParamExample {json} Request-Example:
 *     {
 *       "priorities": {
 *         "1": 10,
 *         "2": 20,
 *         "3": 30
 *       }
 *     }
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Operation details
 */
class ChangePriorityAction
{
    /**
     * Change priority of multiple outbound routes
     * 
     * @param array $data Request data containing priority map
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Extract priorities from request data
        $priorities = $data['priorities'] ?? $data;
        
        if (empty($priorities) || !is_array($priorities)) {
            $res->messages['error'][] = 'No priority data provided';
            return $res;
        }
        
        try {
            return self::updatePrioritiesInTransaction($priorities, $res);
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            return $res;
        }
    }
    
    /**
     * Update route priorities within a database transaction
     * 
     * @param array $priorities Map of route ID to priority
     * @param PBXApiResult $res Result object to populate
     * @return PBXApiResult
     * @throws \Exception
     */
    private static function updatePrioritiesInTransaction(array $priorities, PBXApiResult $res): PBXApiResult
    {
        $di = \Phalcon\Di\Di::getDefault();
        $db = $di->get('db');
        
        $db->begin();
        
        try {
            $updatedCount = 0;
            $errors = [];
            
            foreach ($priorities as $routeId => $newPriority) {
                $result = self::updateSingleRoutePriority((string)$routeId, (int)$newPriority);
                
                if ($result['success']) {
                    $updatedCount++;
                } elseif ($result['error']) {
                    $errors[] = $result['error'];
                }
            }
            
            if (!empty($errors)) {
                $db->rollback();
                $res->messages['error'] = $errors;
                return $res;
            }
            
            $db->commit();
            
            $res->success = true;
            $res->data = [
                'updated' => $updatedCount,
                'message' => "Successfully updated {$updatedCount} route priorities"
            ];
            
            return $res;
            
        } catch (\Exception $e) {
            $db->rollback();
            throw $e;
        }
    }
    
    /**
     * Update priority for a single route
     * 
     * @param string $routeId Route ID to update
     * @param int $newPriority New priority value
     * @return array Result with 'success' boolean and optional 'error' message
     */
    private static function updateSingleRoutePriority(string $routeId, int $newPriority): array
    {
        $route = OutgoingRoutingTable::findFirstById($routeId);
        
        if (!$route) {
            return ['success' => false, 'error' => "Route ID {$routeId} not found"];
        }
        
        $route->priority = (string)$newPriority;
        
        if (!$route->update()) {
            $errorMessage = implode(', ', $route->getMessages());
            return ['success' => false, 'error' => "Failed to update route ID {$routeId}: {$errorMessage}"];
        }
        
        return ['success' => true, 'error' => null];
    }
}
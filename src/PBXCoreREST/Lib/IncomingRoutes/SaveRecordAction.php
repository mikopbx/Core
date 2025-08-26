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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Action for saving incoming route record
 * 
 * @api {post} /pbxcore/api/v2/incoming-routes/saveRecord Create incoming route
 * @api {put} /pbxcore/api/v2/incoming-routes/saveRecord/:id Update incoming route
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} rulename Route name
 * @apiParam {String} number DID number
 * @apiParam {String} [providerid] Provider uniqid (null for any provider)
 * @apiParam {Number} [priority] Route priority (auto-assigned if empty)
 * @apiParam {Number} [timeout] Ring timeout in seconds (default: 18)
 * @apiParam {String} [extension] Forward to extension number
 * @apiParam {String} [audio_message_id] Sound file ID for audio message
 * @apiParam {String} [note] Route description/note
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved incoming route data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save incoming route record
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        // Define sanitization rules
        $sanitizationRules = [
            'id' => 'int',
            'rulename' => 'string|sanitize|max:64',
            'number' => 'string|max:32',
            'providerid' => 'string|max:64|empty_to_null',  // Map from frontend field name
            'priority' => 'int',
            'timeout' => 'int',
            'extension' => 'string|max:32',
            'audio_message_id' => 'string|max:64|empty_to_null',
            'note' => 'string|sanitize|max:255|empty_to_null'
        ];
        
        // Text fields for unified processing
        $textFields = ['rulename', 'note'];

        try {
            // Sanitize only allowed fields
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization using new approach
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Map providerid to provider for database
            if (isset($sanitizedData['providerid'])) {
                if (empty($sanitizedData['providerid']) || $sanitizedData['providerid'] === 'none') {
                    $sanitizedData['provider'] = null;
                } else {
                    $sanitizedData['provider'] = $sanitizedData['providerid'];
                }
                unset($sanitizedData['providerid']);  // Remove frontend field name
            }
            if (isset($sanitizedData['audio_message_id']) && $sanitizedData['audio_message_id'] === 'none') {
                $sanitizedData['audio_message_id'] = null;
            }
            
            // Find or create record
            if (!empty($sanitizedData['id'])) {
                $route = IncomingRoutingTable::findFirstById($sanitizedData['id']);
                if (!$route) {
                    $res->messages['error'][] = 'api_IncomingRouteNotFound';
                    return $res;
                }
            } else {
                $route = new IncomingRoutingTable();
                $route->uniqid = IncomingRoutingTable::generateUniqueID('INC-ROUTE-');
            }
            
            // Handle priority
            if (empty($sanitizedData['priority'])) {
                // Find the highest priority, excluding 9999
                $params = [
                    'column' => 'priority',
                    'conditions' => 'priority != 9999',
                ];
                $maxPriority = IncomingRoutingTable::maximum($params);
                $sanitizedData['priority'] = $maxPriority + 1;
            }
            
            // Handle timeout default
            if (empty($sanitizedData['timeout'])) {
                $sanitizedData['timeout'] = 18;
            }
            
            // Save in transaction
            $savedRoute = self::executeInTransaction(function() use ($route, $sanitizedData) {
                // Update route fields
                $route->rulename = $sanitizedData['rulename'] ?? '';
                $route->number = $sanitizedData['number'] ?? '';
                $route->provider = $sanitizedData['provider'];
                $route->priority = $sanitizedData['priority'];
                $route->timeout = $sanitizedData['timeout'];
                $route->extension = $sanitizedData['extension'] ?? '';
                $route->audio_message_id = $sanitizedData['audio_message_id'];
                $route->note = $sanitizedData['note'] ?? '';
                
                if (!$route->save()) {
                    throw new \Exception('Failed to save incoming route: ' . implode(', ', $route->getMessages()));
                }
                
                // Handle time-based routing (OutWorkTimesRouts)
                self::updateTimeBasedRouting($route);
                
                return $route;
            });
            
            $res->data = DataStructure::createFromModel($savedRoute);
            $res->success = true;
            
            // Only set reload for new records
            if (empty($data['id'])) {
                $res->reload = "incoming-routes/modify/{$savedRoute->id}";
            }
            
            // Log successful operation
            self::logSuccessfulSave('Incoming route', $savedRoute->rulename, $savedRoute->number, __METHOD__);
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleSaveError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Update time-based routing associations
     * 
     * @param IncomingRoutingTable $route
     * @return void
     */
    private static function updateTimeBasedRouting(IncomingRoutingTable $route): void
    {
        $timeConditionIds = self::findTimeConditionIds($route);
        
        foreach ($timeConditionIds as $conditionId) {
            self::createOrUpdateTimeRouting($route->id, $conditionId);
        }
    }
    
    /**
     * Find time condition IDs for the given route
     * 
     * @param IncomingRoutingTable $route
     * @return array Array of time condition IDs
     */
    private static function findTimeConditionIds(IncomingRoutingTable $route): array
    {
        $di = \Phalcon\Di\Di::getDefault();
        $manager = $di->get('modelsManager');
        
        $providerCondition = $route->provider === null ? 
            'provider IS NULL' : 
            'provider = :provider:';
        
        $queryOptions = [
            'models' => ['IncomingRoutingTable' => IncomingRoutingTable::class],
            'columns' => ['timeConditionId' => 'OutWorkTimesRouts.timeConditionId'],
            'conditions' => "number = :did: AND {$providerCondition}",
            'bind' => array_filter([
                'did' => $route->number,
                'provider' => $route->provider,
            ]),
            'joins' => [
                'OutWorkTimesRouts' => [
                    OutWorkTimesRouts::class,
                    'IncomingRoutingTable.id = OutWorkTimesRouts.routId',
                    'OutWorkTimesRouts',
                    'INNER',
                ],
            ],
            'group' => ['timeConditionId']
        ];
        
        $query = $manager->createBuilder($queryOptions)->getQuery();
        $results = $query->execute()->toArray();
        
        return array_column($results, 'timeConditionId');
    }
    
    /**
     * Create or update time routing record
     * 
     * @param int $routeId Route ID
     * @param int $conditionId Time condition ID
     * @return void
     */
    private static function createOrUpdateTimeRouting(int $routeId, int $conditionId): void
    {
        $existingRecord = OutWorkTimesRouts::findFirst([
            'conditions' => 'timeConditionId = :timeConditionId: AND routId = :routId:',
            'bind' => [
                'timeConditionId' => $conditionId,
                'routId' => $routeId,
            ],
        ]);
        
        if ($existingRecord === null) {
            $newRecord = new OutWorkTimesRouts();
            $newRecord->routId = $routeId;
            $newRecord->timeConditionId = $conditionId;
            $newRecord->save();
        }
    }
}
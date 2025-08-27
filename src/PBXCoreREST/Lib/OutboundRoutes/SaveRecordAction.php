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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Action for saving outbound route record.
 * 
 * @api {post} /pbxcore/api/v2/outbound-routes/saveRecord Create outbound route
 * @api {put} /pbxcore/api/v2/outbound-routes/saveRecord/:id Update outbound route
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} rulename Route name
 * @apiParam {String} [provider] Provider uniqid
 * @apiParam {Number} [priority] Route priority (auto-assigned if empty)
 * @apiParam {String} [numberbeginswith] Number pattern prefix
 * @apiParam {Number} [restnumbers] Rest numbers count (-1 for any)
 * @apiParam {Number} [trimfrombegin] Trim digits count from beginning
 * @apiParam {String} [prepend] Prepend digits to number
 * @apiParam {String} [note] Route description/note
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved outbound route data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save outbound route record.
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
            'providerid' => 'string|max:64',  // Unified field name, required field
            'priority' => 'int',
            'numberbeginswith' => 'string|max:32',
            'restnumbers' => 'int|min:-1|max:20',
            'trimfrombegin' => 'int|min:0|max:30',
            'prepend' => 'string|max:32',
            'note' => 'string|sanitize|max:255|empty_to_null'
        ];
        
        // Text fields for unified processing
        $textFields = ['rulename', 'note'];

        try {
            // Sanitize only allowed fields
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization using new approach
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Validate provider exists
            if (!empty($sanitizedData['providerid'])) {
                $provider = Providers::findFirstByUniqid($sanitizedData['providerid']);
                if (!$provider) {
                    $res->messages['error'][] = 'api_OutboundRouteProviderNotFound';
                    return $res;
                }
            } else {
                // Provider is required for outbound routes
                $res->messages['error'][] = 'api_OutboundRouteProviderRequired';
                return $res;
            }
            
            // Find or create record
            if (!empty($sanitizedData['id'])) {
                $route = OutgoingRoutingTable::findFirstById($sanitizedData['id']);
                if (!$route) {
                    $res->messages['error'][] = 'api_OutboundRouteNotFound';
                    return $res;
                }
            } else {
                $route = new OutgoingRoutingTable();
            }
            
            // Handle priority
            if (empty($sanitizedData['priority'])) {
                $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
                $sanitizedData['priority'] = (int)$maxPriority + 1;
            }
            
            // Handle default values
            if (!isset($sanitizedData['restnumbers']) || $sanitizedData['restnumbers'] === '') {
                $sanitizedData['restnumbers'] = -1;  // -1 means any number of digits
            }
            if (!isset($sanitizedData['trimfrombegin'])) {
                $sanitizedData['trimfrombegin'] = 0;
            }
            
            // Save in transaction
            $savedRoute = self::executeInTransaction(function() use ($route, $sanitizedData) {
                // Update route fields
                $route->rulename = $sanitizedData['rulename'] ?? '';
                $route->providerid = $sanitizedData['providerid'];  // Use unified field name
                $route->priority = (string)$sanitizedData['priority'];
                $route->numberbeginswith = $sanitizedData['numberbeginswith'] ?? '';
                $route->restnumbers = (string)$sanitizedData['restnumbers'];
                $route->trimfrombegin = (string)$sanitizedData['trimfrombegin'];
                $route->prepend = $sanitizedData['prepend'] ?? '';
                $route->note = $sanitizedData['note'] ?? '';
                
                if (!$route->save()) {
                    throw new \Exception('Failed to save outbound route: ' . implode(', ', $route->getMessages()));
                }
                
                return $route;
            });
            
            $res->data = DataStructure::createFromModel($savedRoute);
            $res->success = true;
            
            // Only set reload for new records
            if (empty($data['id'])) {
                $res->reload = "outbound-routes/modify/{$savedRoute->id}";
            }
            
            // Log successful operation
            self::logSuccessfulSave('Outbound route', $savedRoute->rulename, $savedRoute->numberbeginswith, __METHOD__);
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleError($e, $res);
        }
        
        return $res;
    }
}
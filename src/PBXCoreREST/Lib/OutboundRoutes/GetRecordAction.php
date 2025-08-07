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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting outbound route record
 * 
 * @api {get} /pbxcore/api/v2/outbound-routes/getRecord/:id Get outbound route record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * @apiParam {String} [copy-source] Source record ID to copy from
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Outbound route data
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get outbound route record
     * 
     * @param string|null $id Record ID or null for new record
     * @param string|null $copySource Source ID to copy from when creating new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null, ?string $copySource = null): PBXApiResult
    {
        // Handle copy operation
        if (!empty($copySource) && (empty($id) || $id === 'new')) {
            return self::getCopyRecord($copySource);
        }
        
        return self::executeStandardGetRecord(
            $id,
            OutgoingRoutingTable::class,     // Model class
            DataStructure::class,            // DataStructure class  
            'OUT-ROUTE-',                    // Unique ID prefix
            [                                // Entity-specific defaults
                'rulename' => '',
                'providerid' => '',
                'priority' => '0',  // Will be set to max+1 when saving
                'numberbeginswith' => '',
                'restnumbers' => '9',
                'trimfrombegin' => '0',
                'prepend' => '',
                'note' => ''
            ],
            'Outbound route not found',      // Not found message
            false,                           // Doesn't need extension for new records
            function($model) {               // New record callback
                // Set priority for new records
                $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
                $model->priority = (string)((int)$maxPriority + 1);
                return $model;
            }
        );
    }
    
    /**
     * Get copy of existing record
     * 
     * @param string $copySource Source record ID
     * @return PBXApiResult
     */
    private static function getCopyRecord(string $copySource): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $sourceRoute = OutgoingRoutingTable::findFirstById($copySource);
            if (!$sourceRoute) {
                $res->messages['error'][] = 'Source route not found for copying';
                return $res;
            }
            
            // Create new model with copied data
            $newRoute = new OutgoingRoutingTable();
            foreach ($sourceRoute->toArray() as $key => $value) {
                if ($key !== 'id') {
                    $newRoute->$key = $value;
                }
            }
            
            // Update specific fields for copy
            $newRoute->id = '';
            $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
            $newRoute->priority = (string)((int)$maxPriority + 1);
            $newRoute->rulename = $sourceRoute->rulename . ' - Copy';
            $newRoute->note = '';
            
            $res->data = DataStructure::createFromModel($newRoute);
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
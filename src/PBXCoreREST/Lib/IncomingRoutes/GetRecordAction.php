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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting incoming route record
 * 
 * @api {get} /pbxcore/api/v2/incoming-routes/getRecord/:id Get incoming route record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Incoming route data
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get incoming route record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        // Special handling for default route (ID=1)
        if ($id === '1') {
            return self::getDefaultRoute();
        }
        
        return self::executeStandardGetRecord(
            $id,
            IncomingRoutingTable::class,     // Model class
            DataStructure::class,            // DataStructure class  
            'INC-ROUTE-',                    // Unique ID prefix
            [                                // Entity-specific defaults
                'rulename' => '',
                'number' => '',
                'provider' => null,              // Database field name (will be mapped to providerid)
                'priority' => '0',  // Will be set to max+1 when saving
                'timeout' => '120',
                'extension' => '',
                'audio_message_id' => null,
                'note' => ''
            ],
            'Incoming route not found',      // Not found message
            false,                           // Doesn't need extension for new records
            function($model) {               // New record callback
                // Set priority for new records
                $model->priority = (string)IncomingRoutingTable::getMaxNewPriority();
                return $model;
            }
        );
    }
    
    /**
     * Get default incoming route (ID=1)
     * 
     * @return PBXApiResult
     */
    private static function getDefaultRoute(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $defaultRule = IncomingRoutingTable::findFirstById(1);
            if ($defaultRule === null) {
                // Create default route if it doesn't exist
                $defaultRule = IncomingRoutingTable::resetDefaultRoute();
            }
            
            $res->data = DataStructure::createFromModel($defaultRule);
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
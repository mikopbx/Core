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

/**
 * Action for getting default values for new outbound route
 * 
 * @api {get} /pbxcore/api/v3/outbound-routes:getDefault Get default values for new outbound route
 * @apiVersion 3.0.0
 * @apiName GetDefault
 * @apiGroup OutboundRoutes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default outbound route data
 */
class GetDefaultAction
{
    /**
     * Get default values for new outbound route
     * 
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Create new model with defaults
            $model = new OutgoingRoutingTable();
            
            // Don't set id - it will be auto-generated on save
            $model->id = '';
            
            // Set default values
            $model->rulename = '';
            $model->providerid = '';
            $model->numberbeginswith = '';
            $model->restnumbers = '9';
            $model->trimfrombegin = '0';
            $model->prepend = '';
            $model->note = '';
            
            // Set priority to max+1
            $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
            $model->priority = (string)((int)$maxPriority + 1);
            
            // Convert to data structure
            $res->data = DataStructure::createFromModel($model);
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
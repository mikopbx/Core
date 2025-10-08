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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting default values for a new conference room
 * 
 * This action is used when creating a new conference room to provide
 * default values for form initialization
 * 
 * @api {get} /pbxcore/api/v3/conference-rooms:getDefault Get default values for new conference room
 * @apiVersion 3.0.0
 * @apiName GetDefault
 * @apiGroup ConferenceRooms
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default conference room data
 * @apiSuccess {String} data.id Unique identifier (generated)
 * @apiSuccess {String} data.extension Next available extension number
 * @apiSuccess {String} data.name Empty name for user input
 * @apiSuccess {String} data.pinCode Empty PIN or generated secure PIN
 * @apiSuccess {String} data.isNew Always "1" for new records
 */
class GetDefaultAction
{
    /**
     * Get default values for a new conference room
     * 
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Generate unique ID for the new conference room
            
            $uniqid = ConferenceRooms::generateUniqueID(Extensions::PREFIX_CONFERENCE);
            
            // Get next available extension number using centralized method
            $extensionNumber = Extensions::getNextFreeApplicationNumber();
            
            // Prepare default data structure
            $data = [
                'id' => $uniqid,
                'uniqid' => $uniqid,
                'extension' => $extensionNumber,
                'name' => '',
                'pinCode' => '',
                'isNew' => '1',
                'represent' => 'New Conference Room'
            ];
            
            $res->data = $data;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
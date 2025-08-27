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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all conference rooms
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getList Get all conference rooms
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup ConferenceRooms
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of conference rooms
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 * @apiSuccess {String} data.represent Display representation of conference room (name + extension)
 */
class GetListAction
{
    /**
     * Get list of all conference rooms
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all conference rooms sorted by name
            $rooms = ConferenceRooms::find([
                'order' => 'name ASC'
            ]);
            
            $data = [];
            foreach ($rooms as $room) {
                $data[] = DataStructure::createFromModel($room);
            }
            
            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
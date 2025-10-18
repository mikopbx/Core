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
 * Action for partial update of conference room (modify specific fields)
 * 
 * @api {patch} /pbxcore/api/v3/conference-rooms/:id Partially update conference room
 * @apiVersion 3.0.0
 * @apiName PatchConferenceRoom
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} id Conference room ID
 * @apiParam {String} [name] Conference name
 * @apiParam {String} [pinCode] PIN code for access
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated conference room data
 */
class PatchRecordAction
{
    /**
     * Partially update conference room (only specified fields)
     * 
     * @param array $data Partial conference room data with ID
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $id = $data['id'] ?? '';
        
        if (empty($id)) {
            $res->messages['error'][] = 'Conference room ID is required';
            return $res;
        }
        
        // Find existing conference room
        $conference = ConferenceRooms::findFirstByUniqid($id);

        if (!$conference) {
            $res->messages['error'][] = 'Conference room not found';
            $res->httpCode = 404;
            return $res;
        }
        
        // Get full record data
        $recordResult = GetRecordAction::main($id);
        
        if (!$recordResult->success) {
            return $recordResult;
        }
        
        // Merge existing data with patch data
        $fullData = $recordResult->data;
        
        // Only update fields that are provided in patch data
        foreach ($data as $key => $value) {
            if ($key !== 'id' && array_key_exists($key, $fullData)) {
                $fullData[$key] = $value;
            }
        }
        
        // Save using existing save logic
        return SaveRecordAction::main($fullData);
    }
}
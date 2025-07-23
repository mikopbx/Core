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
 * Action for getting conference room record
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getRecord/:id Get conference room record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Conference room data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 */
class GetRecordAction
{
    /**
     * Get conference room record
     * 
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newRoom = new ConferenceRooms();
            $newRoom->id = '';
            $newRoom->uniqid = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
            $newRoom->extension = Extensions::getNextFreeApplicationNumber();
            $newRoom->name = '';
            $newRoom->pinCode = '';
            
            $res->data = DataStructure::createFromModel($newRoom);
            $res->success = true;
        } else {
            // Find existing record
            $room = ConferenceRooms::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if ($room) {
                $res->data = DataStructure::createFromModel($room);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Conference room not found';
            }
        }
        
        return $res;
    }
}
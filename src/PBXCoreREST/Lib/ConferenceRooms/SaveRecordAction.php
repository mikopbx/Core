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
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving conference room record
 * 
 * @api {post} /pbxcore/api/v2/conference-rooms/saveRecord Create conference room
 * @api {put} /pbxcore/api/v2/conference-rooms/saveRecord/:id Update conference room
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name Conference name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [pinCode] PIN code (digits only)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved conference room data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save conference room record
     * 
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Data sanitization
        $sanitizationRules = [
            'id' => 'int',
            'name' => 'string|html_escape|max:100',
            'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
            'pinCode' => 'string|regex:/^[0-9]*$/|max:20|empty_to_null'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Conference room name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $room = ConferenceRooms::findFirstById($data['id']);
            if (!$room) {
                $res->messages['error'][] = 'api_ConferenceRoomNotFound';
                return $res;
            }
        } else {
            $room = new ConferenceRooms();
            $room->uniqid = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
        }
        
        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $data['extension'],
            $room->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedRoom = BaseActionHelper::executeInTransaction(function() use ($room, $data) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($room->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_CONFERENCE;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 1;
                }
                
                $extension->number = $data['extension'];
                $extension->callerid = $data['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update ConferenceRoom
                $room->extension = $data['extension'];
                $room->name = $data['name'];
                $room->pinCode = $data['pinCode'] ?? '';
                
                if (!$room->save()) {
                    throw new \Exception(implode(', ', $room->getMessages()));
                }
                
                return $room;
            });
            
            $res->data = DataStructure::createFromModel($savedRoom);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "conference-rooms/modify/{$savedRoom->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
}
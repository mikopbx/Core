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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Action for saving conference room record
 * 
 * Extends AbstractSaveRecordAction to leverage:
 * - Unified data sanitization with security validation
 * - Standard validation patterns
 * - Extension uniqueness checking
 * - Transaction-based saving
 * - Tab preservation support
 * 
 * @api {post} /pbxcore/api/v2/conference-rooms/saveRecord Create conference room
 * @api {put} /pbxcore/api/v2/conference-rooms/saveRecord/:id Update conference room
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID (uniqid) for update, omit for create
 * @apiParam {String} name Conference name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [pinCode] PIN code (digits only)
 * @apiParam {String} [currentTab] Current active tab (for preservation after save)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved conference room data
 * @apiSuccess {String} reload URL for page reload
 * @apiSuccess {String} [redirectTab] Tab to redirect to after save
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save conference room record
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Define sanitization rules
        $sanitizationRules = [
            'id' => 'string|max:50',  // Changed to string for uniqid
            'name' => 'string|max:100',
            'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
            'pinCode' => 'string|regex:/^[0-9]*$/|max:20|empty_to_null',
            'currentTab' => 'string|max:50'
        ];
        
        // Sanitize input data using parent method
        try {
            $sanitizedData = self::sanitizeInputData(
                $data, 
                $sanitizationRules,
                ['name']  // Text fields to process
            );
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }
        
        // Define validation rules
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Conference room name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];
        
        // Validate required fields using parent method
        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        // For POST (new records), id contains pre-generated uniqid but record doesn't exist yet
        // For PUT (updates), id contains existing uniqid and record must exist
        $room = null;
        
        if (!empty($sanitizedData['id'])) {
            // Try to find existing record
            $room = ConferenceRooms::findFirstByUniqid($sanitizedData['id']);
            
            if (!$room) {
                // If no existing record found, this must be a new record with pre-generated uniqid
                $room = new ConferenceRooms();
                $room->uniqid = $sanitizedData['id'];
            }
        } else {
            // No id provided, create completely new record
            $room = new ConferenceRooms();
            $room->uniqid = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
        }
        
        // Check extension uniqueness using parent method
        if (!self::checkExtensionUniqueness($sanitizedData['extension'], $room->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using parent method
            $savedRoom = self::executeInTransaction(function() use ($room, $sanitizedData) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($room->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_CONFERENCE;
                    $extension->show_in_phonebook = '1';
                    $extension->public_access = '1';
                }
                
                $extension->number = $sanitizedData['extension'];
                $extension->callerid = $sanitizedData['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update ConferenceRoom
                $room->extension = $sanitizedData['extension'];
                $room->name = $sanitizedData['name'];
                $room->pinCode = $sanitizedData['pinCode'] ?? '';
                
                if (!$room->save()) {
                    throw new \Exception(implode(', ', $room->getMessages()));
                }
                
                return $room;
            });
            
            $res->data = DataStructure::createFromModel($savedRoom);
            $res->data['isNew'] = '0';  // After save, it's no longer new
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "conference-rooms/modify/{$savedRoom->uniqid}";
            
            // Handle tab preservation if requested
            self::handleTabPreservation($sanitizedData, $res);
            
        } catch (\Exception $e) {
            $res = self::handleSaveError($e, $res);
        }
        
        return $res;
    }
}
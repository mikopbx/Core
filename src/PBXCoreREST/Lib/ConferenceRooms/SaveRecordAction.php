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
use MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor;
use MikoPBX\PBXCoreREST\Controllers\ConferenceRooms\RestController;

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
     * @param array<string, mixed> $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // Get sanitization rules automatically from controller attributes
        // Single Source of Truth - rules extracted from #[ApiParameter] attributes
        $sanitizationRules = ParameterSanitizationExtractor::extractFromController(
            RestController::class,
            'create'
        );

        // Text fields for unified processing (no HTML decoding, just sanitization)
        $textFields = ['name'];

        // Preserve critical fields before sanitization (may not be in create rules)
        $recordId = $data['id'] ?? null;
        $recordExtension = $data['extension'] ?? null;

        // Sanitize input data using unified approach
        try {
            $sanitizedData = self::sanitizeInputData(
                $data,
                $sanitizationRules,
                $textFields
            );

            // Restore critical fields after sanitization (essential for UPDATE/PATCH)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($recordExtension !== null) {
                $sanitizedData['extension'] = $recordExtension;
            }
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }
        
        // Validate required fields - extension required only for CREATE
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Conference room name is required']
            ]
        ];

        // Extension required only for CREATE operation
        if (empty($sanitizedData['id'])) {
            $validationRules['extension'] = [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ];
        }

        // Validate required fields using parent method
        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        // Determine if this is CREATE or UPDATE by checking if record exists in DB
        $room = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing conference room by provided ID
            $room = ConferenceRooms::findFirstByUniqid($sanitizedData['id']);
            if ($room) {
                // Record exists - this is UPDATE operation
                $isNewRecord = false;
            }
        }

        if ($isNewRecord) {
            // CREATE operation - create new conference room
            $room = new ConferenceRooms();
            // Use provided ID if available (for migrations/imports), otherwise generate new one
            $room->uniqid = !empty($sanitizedData['id']) ? $sanitizedData['id'] :
                            ConferenceRooms::generateUniqueID(Extensions::PREFIX_CONFERENCE);
        }

        // For PATCH/UPDATE - if extension not provided, use existing value
        if (!$isNewRecord && empty($sanitizedData['extension'])) {
            $sanitizedData['extension'] = $room->extension;
        }

        // Check extension uniqueness using unified approach (only if extension provided)
        if (!empty($sanitizedData['extension']) && !self::checkExtensionUniqueness($sanitizedData['extension'], $room->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict - proper RESTful code
            return $res;
        }

        try {
            // Save in transaction using unified approach
            $savedRoom = self::executeInTransaction(function() use ($room, $sanitizedData) {
                // Update/create Extension using unified approach
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_CONFERENCE,
                    $room->extension
                );

                // Update ConferenceRoom
                $room->extension = $sanitizedData['extension'];
                $room->name = $sanitizedData['name'];
                $room->pinCode = $sanitizedData['pinCode'] ?? '';

                if (!$room->save()) {
                    throw new \Exception('Failed to save conference room: ' . implode(', ', $room->getMessages()));
                }

                return $room;
            });

            $res->data = DataStructure::createFromModel($savedRoom);
            $res->success = true;

            // Set proper HTTP status code: 201 for creation, 200 for update
            $res->httpCode = $isNewRecord ? 201 : 200;

            // Add reload path for page refresh after save
            $res->reload = "conference-rooms/modify/{$savedRoom->uniqid}";

            // Log successful operation using unified approach
            self::logSuccessfulSave('Conference room', $savedRoom->name, $savedRoom->extension, __METHOD__);

        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleError($e, $res);
        }
        
        return $res;
    }
}
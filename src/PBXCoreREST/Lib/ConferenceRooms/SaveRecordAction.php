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
 * Implements 7-phase pattern for conference room save operations:
 * 1. Sanitization - Security (never trust user input)
 * 2. Required validation - Fail fast (don't waste resources)
 * 3. Determine operation - Different logic for new vs existing records
 * 4. Apply defaults - CREATE only, never UPDATE/PATCH
 * 5. Schema validation - After defaults to check complete dataset
 * 6. Save - Transaction wrapper (all-or-nothing)
 * 7. Response - Consistent API format
 *
 * @api {post} /pbxcore/api/v3/conference-rooms Create conference room
 * @api {put} /pbxcore/api/v3/conference-rooms/:id Update conference room
 * @api {patch} /pbxcore/api/v3/conference-rooms/:id Patch conference room
 * @apiVersion 3.0.0
 * @apiName SaveRecord
 * @apiGroup ConferenceRooms
 *
 * @apiParam {String} [id] Record ID (uniqid) for update, omit for create
 * @apiParam {String} name Conference name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [pinCode] PIN code (digits only)
 * @apiParam {String} [description] Description
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

        // ============ PHASE 1: SANITIZATION ============
        // WHY: Security - never trust user input
        // Get sanitization rules from DataStructure (Single Source of Truth)
        $sanitizationRules = DataStructure::getSanitizationRules();

        // Text fields for unified processing (no HTML decoding, just sanitization)
        $textFields = ['name', 'description'];

        // Preserve 'id' field before sanitization (it's readOnly and not in rules)
        // WHY: 'id' is response-only in schema but needed for UPDATE/PATCH operations
        $recordId = $data['id'] ?? null;

        try {
            $sanitizedData = self::sanitizeInputData(
                $data,
                $sanitizationRules,
                $textFields
            );

            // Restore 'id' field after sanitization
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============ PHASE 2: REQUIRED VALIDATION ============
        // WHY: Fail fast - don't waste resources on incomplete data
        // Build validation rules based on operation type
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Conference room name is required']
            ]
        ];

        // ============ PHASE 3: DETERMINE OPERATION ============
        // WHY: Different logic for new vs existing records
        // Determine if this is CREATE or UPDATE by checking if record exists in DB
        $room = null;
        $isNewRecord = true;

        // Get record ID and HTTP method from data
        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST'; // Default to POST for backward compatibility

        if (!empty($recordId)) {
            // Try to find existing conference room by provided ID
            $room = ConferenceRooms::findFirstByUniqid($recordId);
            if ($room) {
                // Record exists - this is UPDATE operation
                $isNewRecord = false;
            } else {
                // Record not found - check if PUT/PATCH should fail with 404
                $error = self::validateRecordExistence($httpMethod, 'Conference room');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // If POST with ID - allow CREATE with predefined ID (migration/import scenario)
            }
        }

        // Extension required only for CREATE operation
        if ($isNewRecord) {
            $validationRules['extension'] = [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ];
        }

        // Validate required fields
        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            $res->httpCode = 422;
            return $res;
        }

        if ($isNewRecord) {
            // CREATE operation - create new conference room
            $room = new ConferenceRooms();
            // Use provided ID if available (for migrations/imports), otherwise generate new one
            $room->uniqid = !empty($recordId) ? $recordId :
                            ConferenceRooms::generateUniqueID(Extensions::PREFIX_CONFERENCE);
        }

        // ============ PHASE 4: APPLY DEFAULTS (CREATE ONLY!) ============
        // WHY CREATE: New records need complete data
        // WHY NOT UPDATE/PATCH: Would overwrite existing values with defaults!
        if ($isNewRecord) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }

        // For PATCH/UPDATE - if extension not provided, use existing value
        if (!$isNewRecord && empty($sanitizedData['extension'])) {
            $sanitizedData['extension'] = $room->extension;
        }

        // ============ PHASE 5: SCHEMA VALIDATION ============
        // WHY: Validate AFTER defaults to check complete dataset
        // Validate against DataStructure constraints (pattern, maxLength, enum, etc.)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422;
            return $res;
        }

        // Check extension uniqueness using unified approach
        // The method handles comparison with current extension automatically
        if (!self::checkExtensionUniqueness($sanitizedData['extension'], $room->extension ?? null)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict - proper RESTful code
            return $res;
        }

        // ============ PHASE 6: SAVE ============
        // WHY: All-or-nothing transaction
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

                // Apply fields with isset() for PATCH support
                if (isset($sanitizedData['extension'])) {
                    $room->extension = $sanitizedData['extension'];
                }
                if (isset($sanitizedData['name'])) {
                    $room->name = $sanitizedData['name'];
                }
                if (isset($sanitizedData['pinCode'])) {
                    $room->pinCode = $sanitizedData['pinCode'];
                }
                if (isset($sanitizedData['description'])) {
                    $room->description = $sanitizedData['description'];
                }

                if (!$room->save()) {
                    throw new \Exception('Failed to save conference room: ' . implode(', ', $room->getMessages()));
                }

                return $room;
            });

            // ============ PHASE 7: RESPONSE ============
            // WHY: Consistent API format
            $res->data = DataStructure::createFromModel($savedRoom);
            $res->success = true;

            // Set proper HTTP status code: 201 for creation, 200 for update
            $res->httpCode = $isNewRecord ? 201 : 200;

            // Add reload path for page refresh after save
            $res->reload = "conference-rooms/modify/{$savedRoom->uniqid}";

            // Log successful operation
            self::logSuccessfulSave('Conference room', $savedRoom->name, $savedRoom->extension, __METHOD__);

        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleError($e, $res);
        }

        return $res;
    }
}

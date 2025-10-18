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

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * ✨ REFERENCE IMPLEMENTATION: SoundFiles Save Action
 *
 * This follows the canonical 7-phase pattern with file metadata management.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (name)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - category, description
 * 5. VALIDATE SCHEMA: Check constraints (maxLength, enum)
 * 6. SAVE: Transaction with file metadata
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Note: Actual file upload is handled separately (UploadFileAction)
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save sound file metadata with comprehensive validation
     *
     * Handles CREATE, UPDATE (PUT), and PATCH operations:
     * - CREATE: New record with auto-increment ID
     * - UPDATE: Full replacement of existing record
     * - PATCH: Partial update of existing record
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // WHY: Security - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['name', 'description'];

        // Preserve ID field that may not be in sanitization rules
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // ============================================================

        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Sound file name is required'],
                ['type' => 'minLength', 'value' => 1, 'message' => 'Name must not be empty']
            ]
        ];

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // WHY: Different logic for new vs existing records
        // ============================================================

        $soundFile = null;
        $isNewRecord = true;
        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($recordId)) {
            // Try to find existing record by numeric ID
            $soundFile = SoundFiles::findFirstById($recordId);

            if ($soundFile) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                // WHY: PUT/PATCH on non-existent resource must return 404 (REST standard)
                // POST with custom ID is allowed for migrations/imports
                $error = self::validateRecordExistence($httpMethod, 'Sound file');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed - continue with creation
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new sound file
            $soundFile = new SoundFiles();
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE/PATCH: Would overwrite existing values with defaults!
        // ============================================================

        if ($isNewRecord) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (minLength/maxLength, enum constraints)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction
        // ============================================================

        try {
            $savedSoundFile = self::executeInTransaction(function() use ($soundFile, $sanitizedData, $isNewRecord) {
                // Update name
                if (isset($sanitizedData['name'])) {
                    $soundFile->name = $sanitizedData['name'];
                }

                // Update description (PATCH support with isset())
                if (isset($sanitizedData['description'])) {
                    $soundFile->description = $sanitizedData['description'];
                } elseif ($isNewRecord) {
                    $soundFile->description = '';
                }

                // Update category (PATCH support with isset())
                if (isset($sanitizedData['category'])) {
                    $soundFile->category = $sanitizedData['category'];
                } elseif ($isNewRecord) {
                    $soundFile->category = SoundFiles::CATEGORY_CUSTOM;
                }

                // Update path if provided (PATCH support with isset())
                if (isset($sanitizedData['path'])) {
                    $soundFile->path = $sanitizedData['path'];
                }

                // Save sound file
                if (!$soundFile->save()) {
                    throw new \Exception('Failed to save sound file: ' . implode(', ', $soundFile->getMessages()));
                }

                return $soundFile;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
            // ============================================================

            $res->data = DataStructure::createFromModel($savedSoundFile);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            if ($isNewRecord) {
                $res->reload = "sound-files/modify/{$savedSoundFile->id}";
            }

            self::logSuccessfulSave('Sound file', $savedSoundFile->name, (string)$savedSoundFile->id, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}

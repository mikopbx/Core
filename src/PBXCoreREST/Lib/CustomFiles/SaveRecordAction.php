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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * ✨ REFERENCE IMPLEMENTATION: CustomFiles Save Action
 *
 * This follows the canonical 7-phase pattern with security-critical path validation.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (filepath, content)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - mode=none, changed='0'
 * 5. VALIDATE SCHEMA: Check constraints (maxLength, enum) + business rules (filepath uniqueness)
 * 6. SAVE: Transaction with base64 handling + mode protection + ApplyCustomFilesAction
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Security Features:
 * - Base64 handling: setContent()/getContent() for proper encoding
 * - Mode protection: MODE_CUSTOM files cannot change mode (user-created files)
 * - System files (append/override/script/none): can switch modes freely
 * - Async application: ApplyCustomFilesAction via WorkerModelsEvents
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save custom file record with comprehensive validation
     *
     * Handles CREATE and UPDATE operations:
     * - CREATE: New record with mode from request (or default), supports both system and user files
     * - UPDATE: Mode protection for MODE_CUSTOM files, free mode switching for system files
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
        $textFields = ['description'];

        // Preserve ID (essential for UPDATE operations)
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved fields
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: DETERMINE OPERATION TYPE FIRST
        // WHY: Required fields differ for CREATE vs UPDATE/PATCH
        // ============================================================

        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST';
        $record = null;

        if (!empty($recordId)) {
            // Try to find existing record by numeric ID
            $record = CustomFiles::findFirstById($recordId);

            if ($record) {
                // Record exists - UPDATE operation
                $isCreateOperation = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                $error = self::validateRecordExistence($httpMethod, 'custom file');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
                $isCreateOperation = true;
            }
        } else {
            // No ID provided - CREATE operation
            $isCreateOperation = true;
        }

        // ============================================================
        // PHASE 3: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // NOTE: Required fields differ for CREATE vs UPDATE/PATCH
        // ============================================================

        $validationRules = [];

        if ($isCreateOperation) {
            // CREATE: filepath is required, content is optional (empty allowed for MODE_NONE)
            $validationRules = [
                'filepath' => [
                    ['type' => 'required', 'message' => 'File path is required'],
                    ['type' => 'minLength', 'value' => 1, 'message' => 'File path must not be empty']
                ]
                // content is optional even for CREATE - empty content with mode=none is valid
            ];
        } else {
            // UPDATE/PATCH: Only validate fields that are present
            if (isset($sanitizedData['filepath']) && $sanitizedData['filepath'] !== null) {
                $validationRules['filepath'] = [
                    ['type' => 'minLength', 'value' => 1, 'message' => 'File path must not be empty']
                ];
            }
            // For PATCH, content is optional:
            // - Not present in request → keep existing content
            // - Empty string → clear file content (valid for mode=none)
            // - Non-empty string → update content
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        if ($isCreateOperation) {
            // CREATE: Initialize new custom file
            $record = new CustomFiles();
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE: Would overwrite existing values with defaults!
        // ============================================================

        if ($isCreateOperation) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION + BUSINESS RULES
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (minLength/maxLength, enum constraints)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Business rules validation (filepath uniqueness, path security)
        $businessErrors = self::validateBusinessRules($sanitizedData, $record->id ?? null);
        if (!empty($businessErrors)) {
            $res->messages['error'] = array_merge($res->messages['error'] ?? [], $businessErrors);
            $res->httpCode = 422;
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction
        // ============================================================

        try {
            $savedRecord = self::executeInTransaction(function() use ($record, $sanitizedData, $isCreateOperation) {
                // Update filepath (PATCH support with isset())
                if (isset($sanitizedData['filepath'])) {
                    $record->filepath = $sanitizedData['filepath'];
                }

                // Update content with base64 handling (PATCH support with isset())
                if (isset($sanitizedData['content'])) {
                    // If content is not base64 encoded, encode it
                    if (base64_decode($sanitizedData['content'], true) === false) {
                        $record->setContent($sanitizedData['content']);
                    } else {
                        $record->content = $sanitizedData['content'];
                    }
                } elseif ($isCreateOperation) {
                    $record->setContent('');
                }

                // Update mode with special handling (PATCH support with isset())
                if ($isCreateOperation) {
                    // CREATE: Use mode from request (defaults applied in Phase 4)
                    // WHY: Allows creating both system files (append/override/script) and user files (custom)
                    if (isset($sanitizedData['mode'])) {
                        $record->mode = $sanitizedData['mode'];
                    }
                    // If mode not provided, default was already applied in Phase 4
                } elseif (isset($sanitizedData['mode'])) {
                    // UPDATE: Protect MODE_CUSTOM from changes
                    if ($record->mode === CustomFiles::MODE_CUSTOM) {
                        // MODE_CUSTOM files cannot have their mode changed
                        // WHY: User-created custom files must stay MODE_CUSTOM
                        $record->mode = CustomFiles::MODE_CUSTOM;
                    } else {
                        // For non-custom files (none/append/override/script), allow mode changes
                        // WHY: System files can switch between operational modes freely
                        $record->mode = $sanitizedData['mode'];
                    }
                }

                // Update description (PATCH support with isset())
                if (isset($sanitizedData['description'])) {
                    $record->description = $sanitizedData['description'];
                } elseif ($isCreateOperation) {
                    $record->description = '';
                }

                // If content is empty, force mode to none (except for MODE_CUSTOM files)
                // WHY: Check raw base64 content, not decoded - prevents mode reset when
                // valid base64 is sent but decodes to empty (e.g., base64_encode('') = '')
                if (empty($record->content) && $record->mode !== CustomFiles::MODE_CUSTOM) {
                    $record->mode = CustomFiles::MODE_NONE;
                }

                // Mark as changed
                $record->changed = '1';

                // Save record
                if (!$record->save()) {
                    throw new \Exception('Failed to save custom file: ' . implode(', ', $record->getMessages()));
                } else {
                    SystemMessages::sysLogMsg(__METHOD__, "Custom file saved: " . json_encode($record?->toArray(), JSON_PRETTY_PRINT), LOG_DEBUG);
                }

                return $record;
            });

            // ============================================================
            // FILE APPLICATION: Standard async mechanism via WorkerModelsEvents
            // WHY: Consistent with other models, allows for async processing
            //
            // Flow: ModelsBase::afterSave (fires after transaction commit)
            //       → processSettingsChanges()
            //       → Beanstalkd queue message
            //       → WorkerModelsEvents receives and processes
            //       → planReloadActionsForCustomFiles()
            //       → ApplyCustomFilesAction (applies file to disk)
            //
            // Timing: File will be applied within 5-15 seconds after save
            // ============================================================

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
            // ============================================================

            $res->data = DataStructure::createFromModel($savedRecord);
            $res->success = true;
            $res->httpCode = $isCreateOperation ? 201 : 200; // 201 Created, 200 OK

            if ($isCreateOperation) {
                $res->reload = "custom-files/modify/{$savedRecord->id}";
            }

            $logMessage = $isCreateOperation
                ? "New custom file created: {$savedRecord->id} ({$savedRecord->filepath})"
                : "Custom file updated: {$savedRecord->id} ({$savedRecord->filepath})";
            SystemMessages::sysLogMsg(__CLASS__, $logMessage, LOG_INFO);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate business rules for custom file
     *
     * @param array $sanitizedData Sanitized input data
     * @param int|null $currentRecordId Current record ID (for updates)
     * @return array Array of validation error messages
     */
    private static function validateBusinessRules(array $sanitizedData, ?int $currentRecordId): array
    {
        $validationErrors = [];

        // Check filepath uniqueness (excluding current record for updates)
        if (!empty($sanitizedData['filepath'])) {
            $conditions = 'filepath = :filepath:';
            $bind = ['filepath' => $sanitizedData['filepath']];

            if ($currentRecordId !== null) {
                $conditions .= ' AND id != :id:';
                $bind['id'] = $currentRecordId;
            }

            $existing = CustomFiles::findFirst([
                'conditions' => $conditions,
                'bind' => $bind
            ]);

            if ($existing) {
                $validationErrors[] = "File with path '{$sanitizedData['filepath']}' already exists";
            }
        }

        return $validationErrors;
    }
}

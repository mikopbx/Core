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
 * 5. VALIDATE SCHEMA: Check constraints (maxLength, enum) + business rules (filepath uniqueness, isPathAllowed)
 * 6. SAVE: Transaction with base64 handling + mode protection + ApplyCustomFilesAction
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Security Features:
 * - Path validation: CustomFiles::isPathAllowed() prevents directory traversal
 * - Base64 handling: setContent()/getContent() for proper encoding
 * - Mode protection: MODE_CUSTOM files cannot change mode
 * - Immediate application: ApplyCustomFilesAction for MODE_CUSTOM files
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save custom file record with comprehensive validation
     *
     * Handles CREATE and UPDATE operations:
     * - CREATE: New record with auto-increment ID, mode=MODE_CUSTOM
     * - UPDATE: Full replacement of existing record, mode protection
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
        // PHASE 2: BASIC REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // NOTE: Content validation happens in Phase 2.5 after loading record
        // ============================================================

        $validationRules = [
            'filepath' => [
                ['type' => 'required', 'message' => 'File path is required'],
                ['type' => 'minLength', 'value' => 1, 'message' => 'File path must not be empty']
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

        if ($isCreateOperation) {
            // CREATE: Initialize new custom file
            $record = new CustomFiles();
        }

        // ============================================================
        // PHASE 2.5: CONTENT VALIDATION (After loading record)
        // WHY: For PATCH/PUT we need to know current mode to validate content
        // ============================================================

        // Determine effective mode (from request or existing record)
        $effectiveMode = $sanitizedData['mode'] ?? ($record ? $record->mode : null);

        // Content is required only for modes that use it (not for MODE_NONE)
        // For MODE_NONE, content is intentionally cleared
        if ($effectiveMode !== CustomFiles::MODE_NONE) {
            // For CREATE, content is always required (except MODE_NONE)
            // For UPDATE/PATCH, content is required only if provided or mode changed to non-NONE
            if ($isCreateOperation || isset($sanitizedData['content'])) {
                $contentValidation = [
                    'content' => [
                        ['type' => 'required', 'message' => 'Content is required']
                    ]
                ];
                $validationErrors = self::validateRequiredFields($sanitizedData, $contentValidation);
                if (!empty($validationErrors)) {
                    $res->messages['error'] = $validationErrors;
                    return $res;
                }
            }
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
        $businessErrors = self::validateBusinessRules($sanitizedData, $record, $isCreateOperation);
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
                    // CREATE: Always MODE_CUSTOM for new user-created files
                    $record->mode = CustomFiles::MODE_CUSTOM;
                } elseif (isset($sanitizedData['mode'])) {
                    // UPDATE: Protect MODE_CUSTOM from changes
                    if ($record->mode === CustomFiles::MODE_CUSTOM) {
                        // MODE_CUSTOM files cannot have their mode changed
                        $record->mode = CustomFiles::MODE_CUSTOM;
                    } else {
                        // For non-custom files, allow mode changes
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
                if (empty($record->getContent()) && $record->mode !== CustomFiles::MODE_CUSTOM) {
                    $record->mode = CustomFiles::MODE_NONE;
                }

                // Mark as changed
                $record->changed = '1';

                // Save record
                if (!$record->save()) {
                    throw new \Exception('Failed to save custom file: ' . implode(', ', $record->getMessages()));
                }

                // Force immediate application of custom file to filesystem
                if ($record->mode === CustomFiles::MODE_CUSTOM) {
                    // Directly apply the file using the action class
                    // IMPORTANT: execute() expects array of records, each record is array with fileId
                    $applyAction = new \MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ApplyCustomFilesAction();
                    $applyAction->execute([['fileId' => $record->id]]);
                }

                return $record;
            });

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
     * Directory restrictions apply only to MODE_CUSTOM files (user-created).
     * System files (MODE_NONE, MODE_APPEND, MODE_OVERRIDE, MODE_SCRIPT) can be in any directory.
     *
     * @param array $sanitizedData Sanitized input data
     * @param CustomFiles $record Current record instance (new or existing)
     * @param bool $isCreateOperation True for CREATE, false for UPDATE
     * @return array Array of validation error messages
     */
    private static function validateBusinessRules(array $sanitizedData, CustomFiles $record, bool $isCreateOperation): array
    {
        $validationErrors = [];

        // Security check: ensure file is in allowed directory (only for MODE_CUSTOM files)
        if (!empty($sanitizedData['filepath'])) {
            // Determine the mode to check against
            // For CREATE: always MODE_CUSTOM (new files are always created with this mode)
            // For UPDATE: use current record's mode
            $modeToCheck = $isCreateOperation ? CustomFiles::MODE_CUSTOM : $record->mode;

            if (!CustomFiles::isPathAllowed($sanitizedData['filepath'], $modeToCheck)) {
                $validationErrors[] = CustomFiles::getSecurityErrorMessage($sanitizedData['filepath']);
            }
        }

        // Check filepath uniqueness (excluding current record for updates)
        if (!empty($sanitizedData['filepath'])) {
            $conditions = 'filepath = :filepath:';
            $bind = ['filepath' => $sanitizedData['filepath']];

            if (!$isCreateOperation && $record->id !== null) {
                $conditions .= ' AND id != :id:';
                $bind['id'] = $record->id;
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

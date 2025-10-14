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
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // ============================================================

        $validationRules = [
            'filepath' => [
                ['type' => 'required', 'message' => 'File path is required'],
                ['type' => 'minLength', 'value' => 1, 'message' => 'File path must not be empty']
            ],
            'content' => [
                ['type' => 'required', 'message' => 'Content is required']
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

        $record = null;
        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by numeric ID
            $record = CustomFiles::findFirstById($sanitizedData['id']);

            if ($record) {
                // Record exists - UPDATE operation
                $isCreateOperation = false;
            } else {
                $res->messages['error'][] = "Custom file with ID {$sanitizedData['id']} not found";
                $res->httpCode = 404;
                return $res;
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
                    $applyAction = new \MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ApplyCustomFilesAction();
                    $applyAction->execute(['fileId' => $record->id]);
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
     * @param array $sanitizedData Sanitized input data
     * @param int|null $currentRecordId Current record ID (for updates)
     * @return array Array of validation error messages
     */
    private static function validateBusinessRules(array $sanitizedData, ?int $currentRecordId): array
    {
        $validationErrors = [];

        // Security check: ensure file is in allowed directory
        if (!empty($sanitizedData['filepath'])) {
            if (!CustomFiles::isPathAllowed($sanitizedData['filepath'])) {
                $validationErrors[] = CustomFiles::getSecurityErrorMessage($sanitizedData['filepath']);
            }
        }

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

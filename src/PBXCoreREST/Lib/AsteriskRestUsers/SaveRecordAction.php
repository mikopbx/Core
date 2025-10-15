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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * ✨ REFERENCE IMPLEMENTATION: AsteriskRestUsers Save Action
 *
 * This follows the canonical 7-phase pattern with ARI user validation.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (username, password)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - applications, weakPassword
 * 5. VALIDATE SCHEMA: Check constraints (maxLength, enum) + business rules (username uniqueness)
 * 6. SAVE: Transaction with applications array handling
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save ARI user record with comprehensive validation
     *
     * Handles CREATE and UPDATE operations:
     * - CREATE: New record with auto-increment ID
     * - UPDATE: Full replacement of existing record
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
        $textFields = ['username', 'description'];

        // Preserve ID and applications array
        $recordId = $data['id'] ?? null;
        $applications = $data['applications'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved fields (essential for UPDATE operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($applications !== null) {
                $sanitizedData['applications'] = is_array($applications) ? $applications : [];
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
            'username' => [
                ['type' => 'required', 'message' => 'Username is required'],
                ['type' => 'minLength', 'value' => 1, 'message' => 'Username must not be empty']
            ]
        ];

        // Password required only for CREATE (UPDATE can skip if keeping existing password)
        $isCreateOperation = empty($sanitizedData['id']);
        if ($isCreateOperation) {
            $validationRules['password'] = [
                ['type' => 'required', 'message' => 'Password is required']
            ];
        }

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
            $record = AsteriskRestUsers::findFirstById($sanitizedData['id']);

            if ($record) {
                // Record exists - UPDATE operation
                $isCreateOperation = false;
            } else {
                $res->messages['error'][] = "ARI user with ID {$sanitizedData['id']} not found";
                $res->httpCode = 404;
                return $res;
            }
        }

        if ($isCreateOperation) {
            // CREATE: Initialize new ARI user
            $record = new AsteriskRestUsers();
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE: Would overwrite existing values with defaults!
        // ============================================================

        if ($isCreateOperation) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Auto-generate password if not provided
            if (empty($sanitizedData['password'])) {
                $sanitizedData['password'] = AsteriskRestUsers::generateARIPassword();
            }
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

        // Business rules validation (username uniqueness)
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
                // Update username (PATCH support with isset())
                if (isset($sanitizedData['username'])) {
                    $record->username = $sanitizedData['username'];
                }

                // Update password (PATCH support with isset())
                if (isset($sanitizedData['password']) && !empty($sanitizedData['password'])) {
                    $record->password = $sanitizedData['password'];
                }

                // Update description (PATCH support with isset())
                if (isset($sanitizedData['description'])) {
                    $record->description = $sanitizedData['description'];
                } elseif ($isCreateOperation) {
                    $record->description = '';
                }

                // Update applications array (PATCH support with isset())
                if (isset($sanitizedData['applications'])) {
                    if (is_array($sanitizedData['applications']) && !empty($sanitizedData['applications'])) {
                        $record->setApplicationsArray($sanitizedData['applications']);
                    } else {
                        $record->applications = '';
                    }
                } elseif ($isCreateOperation) {
                    $record->applications = '';
                }

                // Update weakPassword flag (PATCH support with isset())
                if (isset($sanitizedData['weakPassword'])) {
                    $record->weakPassword = (string)$sanitizedData['weakPassword'];
                } elseif ($isCreateOperation) {
                    $record->weakPassword = '0'; //Unknown password status
                }

                // Save record
                if (!$record->save()) {
                    throw new \Exception('Failed to save ARI user: ' . implode(', ', $record->getMessages()));
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
                $res->reload = "asterisk-rest-users/modify/{$savedRecord->id}";
            }

            self::logSuccessfulSave('ARI user', $savedRecord->username, (string)$savedRecord->id, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate business rules for ARI user
     *
     * @param array $sanitizedData Sanitized input data
     * @param int|null $currentRecordId Current record ID (for updates)
     * @return array Array of validation error messages
     */
    private static function validateBusinessRules(array $sanitizedData, ?int $currentRecordId): array
    {
        $validationErrors = [];
        $t = Di::getDefault()->get(TranslationProvider::SERVICE_NAME);

        // Check username uniqueness (excluding current record for updates)
        if (!empty($sanitizedData['username'])) {
            $conditions = 'username = :username:';
            $bind = ['username' => $sanitizedData['username']];

            if ($currentRecordId !== null) {
                $conditions .= ' AND id != :id:';
                $bind['id'] = $currentRecordId;
            }

            $existing = AsteriskRestUsers::findFirst([
                'conditions' => $conditions,
                'bind' => $bind
            ]);

            if ($existing) {
                $validationErrors[] = $t->_('aru_UsernameAlreadyExists') ?: 'Username already exists';
            }
        }

        return $validationErrors;
    }
}

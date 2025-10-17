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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * ✨ REFERENCE IMPLEMENTATION: AsteriskManagers Save Action
 *
 * This follows the canonical 7-phase pattern with complex permissions structure.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH (needed for validation logic)
 * 3. VALIDATE REQUIRED: Check required fields for CREATE only (username)
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - password, permissions, networkfilterid
 * 5. VALIDATE SCHEMA: Check constraints (maxLength, pattern)
 * 6. SAVE: Transaction with permissions processing
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Permissions Note: 13 permission categories, each with read/write boolean flags
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save Asterisk manager with comprehensive validation
     *
     * Handles CREATE, UPDATE (PUT), and PATCH operations:
     * - CREATE: New record with auto-generated password if not provided
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
        $textFields = ['username', 'description'];

        // Preserve ID field that may not be in sanitization rules
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // Special handling for networkfilterid: convert 'none' to null
            if (isset($sanitizedData['networkfilterid']) &&
                ($sanitizedData['networkfilterid'] === 'none' || $sanitizedData['networkfilterid'] === '')) {
                $sanitizedData['networkfilterid'] = null;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: DETERMINE OPERATION TYPE FIRST
        // WHY: Need to know if CREATE/UPDATE/PATCH before validation
        // ============================================================

        $manager = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by numeric ID
            $manager = AsteriskManagerUsers::findFirstById($sanitizedData['id']);

            if ($manager) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;

                // SECURITY: Prevent modification of system managers
                if (in_array($manager->username, DataStructure::SYSTEM_MANAGERS, true)) {
                    $res->messages['error'][] = "Cannot modify system manager '{$manager->username}'";
                    $res->httpCode = 403; // Forbidden
                    return $res;
                }
            } else {
                $res->messages['error'][] = "Manager with ID {$sanitizedData['id']} not found";
                $res->httpCode = 404;
                return $res;
            }
        }

        // ============================================================
        // PHASE 3: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // NOTE: For PATCH (existing record), required fields are optional
        // ============================================================

        // Only validate required fields for CREATE operations
        if ($isNewRecord) {
            $validationRules = [
                'username' => [
                    ['type' => 'required', 'message' => 'Username is required'],
                    ['type' => 'minLength', 'value' => 1, 'message' => 'Username must not be empty']
                ]
            ];

            $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
        }

        // Initialize new manager if needed
        if ($isNewRecord) {
            $manager = new AsteriskManagerUsers();
            $manager->uniqid = strtoupper('AMI-' . md5(time() . $sanitizedData['username']));
        }

        // Check for duplicate username (only if username is being changed)
        // WHY: Skip check if username hasn't changed for existing record
        if (isset($sanitizedData['username'])) {
            // Determine if username is actually changing
            $usernameChanged = $isNewRecord || ($manager->username !== $sanitizedData['username']);

            if ($usernameChanged) {
                // Use current manager ID (0 for new records) in uniqueness check
                $currentManagerId = $isNewRecord ? 0 : (int)$manager->id;

                if (!self::checkUsernameUniqueness($sanitizedData['username'], $currentManagerId)) {
                    $res->messages['error'][] = "Manager with username '{$sanitizedData['username']}' already exists";
                    $res->httpCode = 409; // Conflict
                    return $res;
                }
            }
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE/PATCH: Would overwrite existing values with defaults!
        // ============================================================

        if ($isNewRecord) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Auto-generate password if not provided
            if (empty($sanitizedData['secret'])) {
                $sanitizedData['secret'] = AsteriskManagerUsers::generateAMIPassword();
            }
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (minLength/maxLength, pattern constraints)
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
            $savedManager = self::executeInTransaction(function() use ($manager, $sanitizedData, $isNewRecord) {
                // Update username
                if (isset($sanitizedData['username'])) {
                    $manager->username = $sanitizedData['username'];
                }

                // Update password (only if provided)
                if (isset($sanitizedData['secret']) && !empty($sanitizedData['secret'])) {
                    $manager->secret = $sanitizedData['secret'];
                } elseif ($isNewRecord && empty($manager->secret)) {
                    // Fallback: generate password for new manager
                    $manager->secret = AsteriskManagerUsers::generateAMIPassword();
                }

                // Update description (PATCH support with isset())
                if (isset($sanitizedData['description'])) {
                    $manager->description = $sanitizedData['description'];
                } elseif ($isNewRecord) {
                    $manager->description = '';
                }

                // Process permissions if provided
                if (isset($sanitizedData['permissions'])) {
                    self::processPermissions($manager, $sanitizedData['permissions']);
                } elseif ($isNewRecord) {
                    // Clear all permissions for new manager with no permissions
                    self::processPermissions($manager, []);
                }

                // Process network filter
                if (isset($sanitizedData['networkfilterid']) || $isNewRecord) {
                    self::processNetworkFilter($manager, $sanitizedData);
                }

                // Update eventfilter (PATCH support with isset())
                if (isset($sanitizedData['eventfilter'])) {
                    $manager->eventfilter = $sanitizedData['eventfilter'];
                } elseif ($isNewRecord) {
                    $manager->eventfilter = '';
                }

                // Save manager
                if (!$manager->save()) {
                    throw new \Exception('Failed to save manager: ' . implode(', ', $manager->getMessages()));
                }

                return $manager;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
            // ============================================================

            $res->data = DataStructure::createFromModel($savedManager);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            if ($isNewRecord) {
                $res->reload = "asterisk-managers/modify/{$savedManager->id}";
            }

            self::logSuccessfulSave('Asterisk manager', $savedManager->username, (string)$savedManager->id, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Check username uniqueness
     *
     * @param string $username Username to check
     * @param int|null $currentId Current manager ID (for updates)
     * @return bool True if username is unique
     */
    private static function checkUsernameUniqueness(string $username, ?int $currentId = null): bool
    {
        $existingManager = AsteriskManagerUsers::findFirst([
            'conditions' => 'username = :username: AND id != :id:',
            'bind' => [
                'username' => $username,
                'id' => $currentId ?? 0,
            ],
        ]);

        return $existingManager === null;
    }

    /**
     * Process permissions from request data
     *
     * Converts boolean permission flags to model format:
     * - true/true => 'readwrite'
     * - true/false => 'read'
     * - false/true => 'write'
     * - false/false => ''
     *
     * @param AsteriskManagerUsers $manager Manager model
     * @param array<string, mixed> $permissions Permissions data from request
     */
    private static function processPermissions(AsteriskManagerUsers $manager, array $permissions): void
    {
        $availablePermissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config',
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];

        if (!empty($permissions)) {
            // Process boolean permission fields
            foreach ($availablePermissions as $perm) {
                // Handle both boolean and string values from JavaScript
                $readKey = $perm . '_read';
                $writeKey = $perm . '_write';

                // Build permission value: 'read', 'write', 'readwrite', or ''
                $hasRead = false;
                $hasWrite = false;

                if (isset($permissions[$readKey])) {
                    $readValue = $permissions[$readKey];
                    if ($readValue === true || $readValue === 'true' || $readValue === 1 || $readValue === '1') {
                        $hasRead = true;
                    }
                }

                if (isset($permissions[$writeKey])) {
                    $writeValue = $permissions[$writeKey];
                    if ($writeValue === true || $writeValue === 'true' || $writeValue === 1 || $writeValue === '1') {
                        $hasWrite = true;
                    }
                }

                // Set the permission field in the model
                if ($hasRead && $hasWrite) {
                    $manager->$perm = 'readwrite';
                } elseif ($hasRead) {
                    $manager->$perm = 'read';
                } elseif ($hasWrite) {
                    $manager->$perm = 'write';
                } else {
                    $manager->$perm = '';
                }
            }
        } else {
            // Clear all permissions if not provided
            foreach ($availablePermissions as $perm) {
                $manager->$perm = '';
            }
        }
    }

    /**
     * Process network filter settings
     *
     * If networkfilterid is provided, use the filter's permit/deny values.
     * Otherwise, use default localhost-only access.
     *
     * @param AsteriskManagerUsers $manager Manager model
     * @param array<string, mixed> $data Request data
     */
    private static function processNetworkFilter(AsteriskManagerUsers $manager, array $data): void
    {
        if (!empty($data['networkfilterid']) && $data['networkfilterid'] !== null) {
            $manager->networkfilterid = $data['networkfilterid'];

            // Get permit/deny from network filter
            $filter = NetworkFilters::findFirstById($data['networkfilterid']);
            if ($filter) {
                $manager->permit = $filter->permit;
                $manager->deny = $filter->deny;
            } else {
                // Fallback to localhost if filter not found
                $manager->permit = '127.0.0.1/255.255.255.255';
                $manager->deny = '0.0.0.0/0.0.0.0';
            }
        } else {
            // No network filter - use default localhost access
            $manager->networkfilterid = null;
            $manager->permit = '127.0.0.1/255.255.255.255';
            $manager->deny = '0.0.0.0/0.0.0.0';
        }
    }
}

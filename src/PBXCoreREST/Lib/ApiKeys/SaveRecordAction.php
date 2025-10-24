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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;

/**
 * ✨ REFERENCE IMPLEMENTATION: ApiKeys Save Action (Security Critical)
 *
 * This follows the canonical 7-phase pattern with security-critical path validation.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (description, key for CREATE)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - networkfilterid, full_permissions, allowed_paths
 * 5. VALIDATE SCHEMA: Check constraints + path format validation (security!)
 * 6. SAVE: Transaction with bcrypt hashing + cache clearing
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Security Note: Path validation is CRITICAL - prevents unauthorized API access
 *
 * @package MikoPBX\PBXCoreREST\Lib\ApiKeys
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save API key with comprehensive validation
     *
     * Handles CREATE, UPDATE (PUT), and PATCH operations:
     * - CREATE: New record with auto-generated key if not provided
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
        $textFields = ['description'];

        // Preserve ID field that may not be in sanitization rules
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // Remove read-only fields that may come from web interface
            // WHY: Prevent confusion - these are computed server-side
            unset($sanitizedData['key_display'], $sanitizedData['has_key']);

            // Special handling for networkfilterid: convert 'none' to null
            if (isset($sanitizedData['networkfilterid']) &&
                ($sanitizedData['networkfilterid'] === 'none' || $sanitizedData['networkfilterid'] === '')) {
                $sanitizedData['networkfilterid'] = null;
            }

            // Special handling for allowed_paths (object with permissions)
            // New format: {"/api/v3/extensions": "write", "/api/v3/cdr": "read"}
            if (isset($data['allowed_paths'])) {
                if (is_array($data['allowed_paths'])) {
                    // Check if it's associative array (new format with permissions)
                    $isAssoc = array_keys($data['allowed_paths']) !== range(0, count($data['allowed_paths']) - 1);

                    if ($isAssoc) {
                        // New format: path => permission mapping
                        $sanitizedPaths = [];
                        foreach ($data['allowed_paths'] as $path => $permission) {
                            $sanitizedPath = filter_var($path, FILTER_SANITIZE_URL);
                            $sanitizedPermission = filter_var($permission, FILTER_SANITIZE_SPECIAL_CHARS);
                            $sanitizedPaths[$sanitizedPath] = $sanitizedPermission;
                        }
                        $sanitizedData['allowed_paths'] = $sanitizedPaths;
                    } else {
                        // Old format: array of paths (backward compatibility)
                        $sanitizedData['allowed_paths'] = array_map(function($path) {
                            return filter_var($path, FILTER_SANITIZE_URL);
                        }, $data['allowed_paths']);
                    }
                } elseif (is_string($data['allowed_paths'])) {
                    // Try to decode JSON string
                    $decoded = json_decode($data['allowed_paths'], true);
                    $sanitizedData['allowed_paths'] = is_array($decoded) ? $decoded : [];
                }
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
            'description' => [
                ['type' => 'required', 'message' => 'Description is required'],
                ['type' => 'minLength', 'value' => 1, 'message' => 'Description must not be empty']
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

        $apiKey = null;
        $isNewRecord = true;

        if (!empty($recordId)) {
            // Try to find existing record by numeric ID
            $apiKey = ApiKeys::findFirstById($recordId);

            if ($apiKey) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                $error = self::validateRecordExistence($httpMethod, 'API Key');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new API key
            $apiKey = new ApiKeys();

            // Key is required for new records
            if (empty($sanitizedData['key'])) {
                // Auto-generate key if not provided
                $sanitizedData['key'] = ApiKeys::generateApiKey();
            }
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
        // PHASE 5: SCHEMA VALIDATION (Security Critical!)
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (minLength/maxLength, pattern constraints)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Security-critical path validation
        if (isset($sanitizedData['allowed_paths']) && is_array($sanitizedData['allowed_paths'])) {
            $pathErrors = self::validateAllowedPaths($sanitizedData['allowed_paths']);
            if (!empty($pathErrors)) {
                $res->messages['error'] = array_merge(
                    $res->messages['error'] ?? [],
                    $pathErrors
                );
                $res->httpCode = 422;
                return $res;
            }
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction with bcrypt hashing
        // ============================================================

        try {
            $savedApiKey = self::executeInTransaction(function() use ($apiKey, $sanitizedData, $isNewRecord) {
                // Update description
                if (isset($sanitizedData['description'])) {
                    $apiKey->description = $sanitizedData['description'];
                }

                // Process API key (hash with bcrypt)
                if (isset($sanitizedData['key']) && !empty($sanitizedData['key'])) {
                    $key = $sanitizedData['key'];
                    $apiKey->key_hash = password_hash($key, PASSWORD_BCRYPT);
                    $apiKey->key_suffix = substr($key, -4);
                    $apiKey->key_display = DataStructure::generateKeyDisplay($key);
                }

                // Update network filter (PATCH support with isset())
                if (isset($sanitizedData['networkfilterid'])) {
                    $apiKey->networkfilterid = $sanitizedData['networkfilterid'];
                } elseif ($isNewRecord) {
                    $apiKey->networkfilterid = null;
                }

                // Update full_permissions (PATCH support with isset())
                if (isset($sanitizedData['full_permissions'])) {
                    $boolFields = ['full_permissions'];
                    $converted = self::convertBooleanFields($sanitizedData, $boolFields);
                    $apiKey->full_permissions = $converted['full_permissions'];
                } elseif ($isNewRecord) {
                    $apiKey->full_permissions = '0';
                }

                // Update allowed_paths (PATCH support with isset())
                if (isset($sanitizedData['allowed_paths'])) {
                    if (is_array($sanitizedData['allowed_paths'])) {
                        $apiKey->allowed_paths = json_encode($sanitizedData['allowed_paths']);
                    } else {
                        $apiKey->allowed_paths = $sanitizedData['allowed_paths'];
                    }
                } elseif ($isNewRecord) {
                    $apiKey->allowed_paths = json_encode([]);
                }

                // Set timestamps
                if ($isNewRecord) {
                    $apiKey->created_at = date('Y-m-d H:i:s');
                }

                // Save API key
                if (!$apiKey->save()) {
                    throw new \Exception('Failed to save API key: ' . implode(', ', $apiKey->getMessages()));
                }

                // Clear validation cache for all tokens (updated permissions/restrictions)
                TokenValidationService::clearCache();

                return $apiKey;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
            // ============================================================

            $res->data = DataStructure::createFromModel($savedApiKey);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            if ($isNewRecord) {
                $res->reload = "api-keys/modify/{$savedApiKey->id}";
            }

            self::logSuccessfulSave('API key', $savedApiKey->description, (string)$savedApiKey->id, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate allowed paths format (Security Critical!)
     *
     * Supports two formats:
     * 1. NEW: Object with permissions - {"/api/v3/extensions": "write", "/api/v3/cdr": "read"}
     * 2. OLD: Array of paths - ["/api/v3/extensions", "/api/v3/cdr"] (backward compatibility)
     *
     * Validates:
     * - Path format: must start with /api/v{number}/
     * - Path components: only lowercase letters, numbers, hyphens
     * - No dangerous characters (../, //, etc.)
     * - Permission values: must be 'read' or 'write' (new format only)
     *
     * WHY: Prevents unauthorized API access through path manipulation
     *
     * @param array<string|array<string, string>> $paths Paths to validate (array or path => permission)
     * @return array<string> List of validation errors (empty if valid)
     */
    private static function validateAllowedPaths(array $paths): array
    {
        $errors = [];

        // Check if it's associative array (new format with permissions)
        $isAssoc = array_keys($paths) !== range(0, count($paths) - 1);

        foreach ($paths as $index => $value) {
            if ($isAssoc) {
                // NEW FORMAT: $index is path, $value is permission
                // Ensure types are strings
                if (!is_string($index) || !is_string($value)) {
                    $errors[] = "Invalid path or permission type (must be strings)";
                    continue;
                }

                $path = $index;
                $permission = $value;

                // Validate permission value
                if (!in_array($permission, ['read', 'write'], true)) {
                    $errors[] = "Invalid permission at path '$path': '$permission'. Must be 'read' or 'write'";
                }
            } else {
                // OLD FORMAT: $value is path (backward compatibility)
                if (!is_string($value)) {
                    $errors[] = "Invalid path type (must be string)";
                    continue;
                }
                $path = $value;
            }

            // Validate path format
            if (!preg_match('#^/api/v[0-9]+/[a-z0-9-]+(/[a-z0-9-]+)*$#', $path)) {
                $errors[] = "Invalid path format '$path'. Must match pattern /api/v{number}/{resource}[/{resource}]";
                continue;
            }

            // Check for dangerous path components
            if (strpos($path, '../') !== false || strpos($path, '//') !== false) {
                $errors[] = "Dangerous path component in '$path' contains ../ or //";
                continue;
            }

            // Check minimum length
            if (strlen($path) < 10) {
                $errors[] = "Path too short '$path' (minimum 10 characters)";
                continue;
            }

            // Check maximum length
            if (strlen($path) > 255) {
                $errors[] = "Path too long '$path' (maximum 255 characters)";
            }
        }

        return $errors;
    }
}

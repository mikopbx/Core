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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;

/**
 * ✨ REFERENCE IMPLEMENTATION: IVR Menu Save Action
 *
 * This is the canonical example of REST API save action following all best practices:
 * - Single Source of Truth pattern (DataStructure::getParameterDefinitions)
 * - Proper data processing pipeline (sanitize → defaults → validate → save)
 * - Schema-based validation (enum, min/max constraints)
 * - Clean separation of concerns
 *
 * Processing Pipeline:
 * 1. SANITIZE: Clean user input (remove dangerous chars, trim, normalize)
 * 2. VALIDATE REQUIRED: Check required fields and basic format
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check enum/range constraints on complete data
 * 6. SAVE: Transaction with extension + model + related records
 *
 * @api {post} /pbxcore/api/v3/ivr-menu Create IVR menu
 * @api {put} /pbxcore/api/v3/ivr-menu/:id Full update
 * @api {patch} /pbxcore/api/v3/ivr-menu/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveIvrMenu
 * @apiGroup IvrMenu
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save IVR menu with comprehensive validation
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // Clean user input to prevent XSS, SQL injection, etc.
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['name', 'description'];

        // Preserve ID fields that may not be in sanitization rules
        $recordId = $data['id'] ?? null;
        $recordExtension = $data['extension'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved fields (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($recordExtension !== null) {
                $sanitizedData['extension'] = $recordExtension;
            }

            // Sanitize routing destination (timeout extension)
            $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, ['timeout_extension'], 20);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // Sanitize actions array (special handling for nested data)
        $actionsData = self::sanitizeActionsData($data['actions'] ?? []);
        $sanitizedData['actions'] = $actionsData;

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // ============================================================

        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'IVR menu name is required']
            ]
        ];

        // Extension required ONLY for CREATE (not for PATCH)
        if (empty($sanitizedData['id'])) {
            $validationRules['extension'] = [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ];
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // ============================================================

        $ivrMenu = null;
        $isNewRecord = true;
        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($recordId)) {
            // Try to find existing record
            $ivrMenu = IvrMenu::findFirst([
                'conditions' => 'uniqid = :uniqid:',
                'bind' => ['uniqid' => $recordId]
            ]);

            if ($ivrMenu) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                // WHY: PUT/PATCH on non-existent resource should return 404, not create new record
                $error = self::validateRecordExistence($httpMethod, 'IVR menu');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations/imports
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new IVR menu
            $ivrMenu = new IvrMenu();
            $ivrMenu->uniqid = !empty($recordId)
                ? $recordId  // Use provided ID (migrations/imports)
                : IvrMenu::generateUniqueID(Extensions::PREFIX_IVR);
        }

        // For PATCH/UPDATE: preserve existing extension if not provided
        if (!$isNewRecord && empty($sanitizedData['extension'])) {
            $sanitizedData['extension'] = $ivrMenu->extension;
        }

        // Check extension uniqueness (skip if unchanged)
        if (!empty($sanitizedData['extension']) &&
            !self::checkExtensionUniqueness($sanitizedData['extension'], $ivrMenu->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict
            return $res;
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY: CREATE needs all fields, UPDATE/PATCH only touches provided fields
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            // Example: timeout=7, number_of_repeat=3, allow_enter_any_internal_extension=false
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }
        // ❌ UPDATE/PATCH: Do NOT apply defaults (would overwrite existing values!)

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // Validate enum, min/max constraints on complete data
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // Transaction ensures atomicity (extension + ivr menu + actions)
        // ============================================================

        try {
            $savedIvrMenu = self::executeInTransaction(function() use ($ivrMenu, $sanitizedData, $isNewRecord) {
                // Create/update Extension record
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_IVR_MENU,
                    $ivrMenu->extension
                );

                // Update IVR Menu model
                // For CREATE: All fields from $sanitizedData (with defaults)
                // For PATCH: Only provided fields (no defaults)
                $ivrMenu->extension = $sanitizedData['extension'];
                $ivrMenu->name = $sanitizedData['name'];

                // Optional sound file ID
                if (isset($sanitizedData['audio_message_id'])) {
                    $ivrMenu->audio_message_id = $sanitizedData['audio_message_id'] ?: '';
                }

                // Timeout (validated against min/max)
                if (isset($sanitizedData['timeout'])) {
                    $ivrMenu->timeout = $sanitizedData['timeout'];
                }

                // Optional timeout extension
                if (isset($sanitizedData['timeout_extension'])) {
                    $ivrMenu->timeout_extension = $sanitizedData['timeout_extension'] ?: '';
                }

                // Number of repeats (validated against min/max)
                if (isset($sanitizedData['number_of_repeat'])) {
                    $ivrMenu->number_of_repeat = $sanitizedData['number_of_repeat'];
                }

                // Optional description
                if (isset($sanitizedData['description'])) {
                    $ivrMenu->description = $sanitizedData['description'] ?: '';
                }

                // Boolean field (convert string/int to boolean)
                if (isset($sanitizedData['allow_enter_any_internal_extension'])) {
                    $booleanFields = ['allow_enter_any_internal_extension'];
                    $convertedData = self::convertBooleanFields($sanitizedData, $booleanFields);
                    $ivrMenu->allow_enter_any_internal_extension = $convertedData['allow_enter_any_internal_extension'] ?? false;
                }

                if (!$ivrMenu->save()) {
                    throw new \Exception(implode(', ', $ivrMenu->getMessages()));
                }

                // Update IVR Menu Actions (replace all)
                if (!empty($sanitizedData['actions'])) {
                    self::updateIvrMenuActions($ivrMenu->uniqid, $sanitizedData['actions']);
                } else {
                    // Remove all existing actions if actions is empty
                    $existingActions = IvrMenuActions::find([
                        'conditions' => 'ivr_menu_id = :uniqid:',
                        'bind' => ['uniqid' => $ivrMenu->uniqid]
                    ]);
                    /** @phpstan-ignore-next-line */
                    if ($existingActions->count() > 0 && !$existingActions->delete()) {
                        throw new \Exception('Failed to delete existing actions');
                    }
                }

                return $ivrMenu;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // Format data using DataStructure (representations, types, etc.)
            // ============================================================

            $res->data = DataStructure::createFromModel($savedIvrMenu);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK
            $res->reload = "ivr-menu/modify/{$savedIvrMenu->uniqid}";

            self::logSuccessfulSave('IVR menu', $savedIvrMenu->name, $savedIvrMenu->extension, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Update IVR menu actions
     *
     * @param string $ivrMenuId IVR menu unique ID
     * @param array<int, array<string, mixed>>|string $actionsData Actions data
     * @throws \Exception
     */
    private static function updateIvrMenuActions(string $ivrMenuId, $actionsData): void
    {
        // Handle both array and JSON string formats
        if (is_array($actionsData)) {
            $actions = $actionsData;
        } elseif (is_string($actionsData)) {
            $actions = json_decode($actionsData, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Invalid actions JSON format: ' . json_last_error_msg());
            }
        } else {
            throw new \Exception('Invalid actions data format');
        }

        $existDigits = [];

        // Update or create IVRMenuActions
        foreach ($actions as $actionData) {
            $parameters = [
                'conditions' => 'ivr_menu_id = :uniqid: AND digits=:digits:',
                'bind' => [
                    'digits' => $actionData['digits'],
                    'uniqid' => $ivrMenuId,
                ],
            ];
            $action = IvrMenuActions::findFirst($parameters);
            if ($action === null) {
                $action = new IvrMenuActions();
                $action->digits = $actionData['digits'];
                $action->ivr_menu_id = $ivrMenuId;
            }
            $action->extension = $actionData['extension'];
            if (!$action->save()) {
                throw new \Exception(implode(', ', $action->getMessages()));
            }
            $existDigits[] = $actionData['digits'];
        }

        // Delete unnecessary IVRMenuActions
        if (!empty($existDigits)) {
            $parameters = [
                'conditions' => 'digits NOT IN ({numbers:array}) AND ivr_menu_id=:uniqid:',
                'bind' => [
                    'numbers' => $existDigits,
                    'uniqid' => $ivrMenuId,
                ],
            ];
        } else {
            $parameters = [
                'conditions' => 'ivr_menu_id=:uniqid:',
                'bind' => [
                    'uniqid' => $ivrMenuId,
                ],
            ];
        }

        $deletedActions = IvrMenuActions::find($parameters);
        /** @phpstan-ignore-next-line */
        if ($deletedActions->count() > 0 && !$deletedActions->delete()) {
            throw new \Exception('Failed to delete old actions');
        }
    }

    /**
     * Sanitize actions data safely
     *
     * @param array<int, array<string, mixed>>|string $actionsData Raw actions data
     * @return array<int, array<string, string>> Sanitized actions data
     * @throws \Exception
     */
    private static function sanitizeActionsData($actionsData): array
    {
        // Handle both array and JSON string formats
        if (is_array($actionsData)) {
            $actions = $actionsData;
        } elseif (is_string($actionsData)) {
            $actions = json_decode($actionsData, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Invalid actions JSON format: ' . json_last_error_msg());
            }
        } else {
            return []; // Empty actions for any other type
        }

        // Sanitize each action
        $sanitizedActions = [];
        foreach ($actions as $action) {
            if (!is_array($action)) {
                continue; // Skip invalid action items
            }

            $sanitizedAction = [
                'digits' => '',
                'extension' => ''
            ];

            // Sanitize digits field (should be digits, *, #, max 10 chars)
            if (isset($action['digits'])) {
                $digits = (string)$action['digits'];
                $digits = preg_replace('/[^0-9*#]/', '', $digits) ?? '';
                $sanitizedAction['digits'] = substr($digits, 0, 10);
            }

            // Sanitize extension field (should be numeric extension or system routing value)
            if (isset($action['extension'])) {
                $extension = trim((string)$action['extension']);
                $sanitizedAction['extension'] = SystemSanitizer::sanitizeRoutingDestination($extension, 20);

                // Validate the sanitized result
                if (!empty($sanitizedAction['extension']) &&
                    !SystemSanitizer::isValidRoutingDestination($sanitizedAction['extension'], 20)) {
                    // If invalid, set to empty to skip this action
                    $sanitizedAction['extension'] = '';
                }
            }

            // Only add if both fields are non-empty
            if (!empty($sanitizedAction['digits']) && !empty($sanitizedAction['extension'])) {
                $sanitizedActions[] = $sanitizedAction;
            }
        }

        return $sanitizedActions;
    }
}

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
use MikoPBX\PBXCoreREST\Lib\Common\ParameterDefaultsExtractor;
use MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor;
use MikoPBX\PBXCoreREST\Controllers\IvrMenu\RestController;

/**
 * Action for saving IVR menu record
 * 
 * @api {post} /pbxcore/api/v2/ivr-menu/saveRecord Create IVR menu
 * @api {put} /pbxcore/api/v2/ivr-menu/saveRecord/:id Update IVR menu
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup IvrMenu
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name IVR menu name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [audio_message_id] Audio message ID
 * @apiParam {String} [timeout] Timeout in seconds (default: 7)
 * @apiParam {String} [timeout_extension] Extension for timeout
 * @apiParam {Boolean} [allow_enter_any_internal_extension] Allow dialing any extension (true/false)
 * @apiParam {String} [number_of_repeat] Number of menu repeats (default: 3)
 * @apiParam {String} [description] IVR menu description
 * @apiParam {String} [actions] JSON array of menu actions
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved IVR menu data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save IVR menu record
     * @param array<string, mixed> $data - Data to save
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
        $textFields = ['name', 'description'];

        // Preserve critical fields before sanitization (may not be in create rules)
        $recordId = $data['id'] ?? null;
        $recordExtension = $data['extension'] ?? null;

        try {
            // Unified data sanitization using new approach - no HTML entity decoding
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore critical fields after sanitization (essential for UPDATE/PATCH)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($recordExtension !== null) {
                $sanitizedData['extension'] = $recordExtension;
            }

            // Sanitize routing destination fields
            $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, ['timeout_extension'], 20);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }
        
        // Separately handle and sanitize actions data
        $actionsData = self::sanitizeActionsData($data['actions'] ?? []);
        $sanitizedData['actions'] = $actionsData;
        
        // Validate required fields - extension required only for CREATE
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'IVR menu name is required']
            ]
        ];

        // Extension required only for CREATE operation
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
        
        // Get or create model
        // Determine if this is CREATE or UPDATE by checking if record exists in DB
        $ivrMenu = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing IVR menu by provided ID
            $ivrMenu = IvrMenu::findFirst([
                'conditions' => 'uniqid = :uniqid:',
                'bind' => ['uniqid' => $sanitizedData['id']]
            ]);
            if ($ivrMenu) {
                // Record exists - this is UPDATE operation
                $isNewRecord = false;
            }
        }

        if ($isNewRecord) {
            // CREATE operation - create new IVR menu
            $ivrMenu = new IvrMenu();
            // Use provided ID if available (for migrations/imports), otherwise generate new one
            $ivrMenu->uniqid = !empty($sanitizedData['id']) ? $sanitizedData['id'] :
                            IvrMenu::generateUniqueID(Extensions::PREFIX_IVR);
        }

        // For PATCH/UPDATE - if extension not provided, use existing value
        if (!$isNewRecord && empty($sanitizedData['extension'])) {
            $sanitizedData['extension'] = $ivrMenu->extension;
        }

        // Check extension uniqueness using unified approach (only if extension provided)
        if (!empty($sanitizedData['extension']) && !self::checkExtensionUniqueness($sanitizedData['extension'], $ivrMenu->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict - proper RESTful code
            return $res;
        }
        
        try {
            // Apply defaults from controller attributes automatically
            // Single Source of Truth - defaults extracted from #[ApiParameter] attributes
            $sanitizedData = ParameterDefaultsExtractor::applyDefaults(
                RestController::class,
                'create',
                $sanitizedData
            );

            // Save in transaction using unified approach
            $savedIvrMenu = self::executeInTransaction(function() use ($ivrMenu, $sanitizedData) {
                // Update/create Extension using unified approach
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_IVR_MENU,
                    $ivrMenu->extension
                );

                // Update IVR Menu - all fields now have proper defaults applied
                $ivrMenu->extension = $sanitizedData['extension'];
                $ivrMenu->name = $sanitizedData['name'];
                $ivrMenu->audio_message_id = $sanitizedData['audio_message_id'] ?? '';
                $ivrMenu->timeout = $sanitizedData['timeout'];
                $ivrMenu->timeout_extension = $sanitizedData['timeout_extension'] ?? '';
                $ivrMenu->number_of_repeat = $sanitizedData['number_of_repeat'];
                $ivrMenu->description = $sanitizedData['description'] ?? '';

                // Convert boolean values using unified approach
                $booleanFields = ['allow_enter_any_internal_extension'];
                $convertedData = self::convertBooleanFields($sanitizedData, $booleanFields);
                $ivrMenu->allow_enter_any_internal_extension = $convertedData['allow_enter_any_internal_extension'];
                
                if (!$ivrMenu->save()) {
                    throw new \Exception(implode(', ', $ivrMenu->getMessages()));
                }
                
                // Update IVR Menu Actions
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
            
            $res->data = DataStructure::createFromModel($savedIvrMenu);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "ivr-menu/modify/{$savedIvrMenu->uniqid}";
            
            // Log successful operation using unified approach
            self::logSuccessfulSave('IVR menu', $savedIvrMenu->name, $savedIvrMenu->extension, __METHOD__);
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Update IVR menu actions
     * @param string $ivrMenuId
     * @param array<int, array<string, mixed>>|string $actionsData
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
     * @param array<int, array<string, mixed>>|string $actionsData
     * @return array<int, array<string, string>>
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
                $digits = preg_replace('/[^0-9*#]/', '', $digits);
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
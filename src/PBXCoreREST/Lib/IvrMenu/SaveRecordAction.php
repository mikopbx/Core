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
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;

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
class SaveRecordAction
{
    /**
     * Save IVR menu record
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Data sanitization
        $sanitizationRules = [
            'id' => 'int',
            'name' => 'string|html_escape|max:100',
            'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
            'audio_message_id' => 'string|max:50|empty_to_null',
            'timeout' => 'int|min:1|max:99',
            'timeout_extension' => 'string|max:20|empty_to_null',
            'allow_enter_any_internal_extension' => 'bool',
            'number_of_repeat' => 'int|min:1|max:99',
            'description' => 'string|html_escape|max:2000'
        ];
        
        // Extract only fields that have sanitization rules
        $fieldsToSanitize = array_intersect_key($data, $sanitizationRules);
        
        // Sanitize main fields
        $sanitizedData = BaseActionHelper::sanitizeData($fieldsToSanitize, $sanitizationRules);
        
        // Custom validation for timeout_extension using SystemSanitizer
        if (isset($sanitizedData['timeout_extension']) && !empty($sanitizedData['timeout_extension'])) {
            if (!SystemSanitizer::isValidRoutingDestination($sanitizedData['timeout_extension'], 20)) {
                $sanitizedData['timeout_extension'] = SystemSanitizer::sanitizeRoutingDestination($sanitizedData['timeout_extension'], 20);
                // If still invalid after sanitization, reject it
                if (!SystemSanitizer::isValidRoutingDestination($sanitizedData['timeout_extension'], 20)) {
                    $res->messages['error'][] = 'Invalid timeout_extension value';
                    return $res;
                }
            }
        }
        
        // Separately handle and sanitize actions data
        $actionsData = self::sanitizeActionsData($data['actions'] ?? []);
        $sanitizedData['actions'] = $actionsData;
        
        $data = $sanitizedData;
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'IVR menu name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $ivrMenu = IvrMenu::findFirstById($data['id']);
            if (!$ivrMenu) {
                $res->messages['error'][] = 'api_IvrMenuNotFound';
                return $res;
            }
        } else {
            $ivrMenu = new IvrMenu();
            $ivrMenu->uniqid = IvrMenu::generateUniqueID('IVR-');
        }
        
        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $data['extension'],
            $ivrMenu->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedIvrMenu = BaseActionHelper::executeInTransaction(function() use ($ivrMenu, $data) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($ivrMenu->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_IVR_MENU;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 1;
                }
                
                $extension->number = $data['extension'];
                $extension->callerid = $data['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update IVR Menu
                $ivrMenu->extension = $data['extension'];
                $ivrMenu->name = $data['name'];
                $ivrMenu->audio_message_id = $data['audio_message_id'] ?? '';
                $ivrMenu->timeout = $data['timeout'] ?? '7';
                $ivrMenu->timeout_extension = $data['timeout_extension'] ?? '';
                $ivrMenu->allow_enter_any_internal_extension = ($data['allow_enter_any_internal_extension'] ?? false) ? '1' : '0';
                $ivrMenu->number_of_repeat = $data['number_of_repeat'] ?? '3';
                $ivrMenu->description = $data['description'] ?? '';
                
                if (!$ivrMenu->save()) {
                    throw new \Exception(implode(', ', $ivrMenu->getMessages()));
                }
                
                // Update IVR Menu Actions
                if (!empty($data['actions'])) {
                    self::updateIvrMenuActions($ivrMenu->uniqid, $data['actions']);
                } else {
                    // Remove all existing actions if actions is empty
                    $existingActions = IvrMenuActions::find([
                        'conditions' => 'ivr_menu_id = :uniqid:',
                        'bind' => ['uniqid' => $ivrMenu->uniqid]
                    ]);
                    if ($existingActions && !$existingActions->delete()) {
                        throw new \Exception('Failed to delete existing actions');
                    }
                }
                
                return $ivrMenu;
            });
            
            $res->data = DataStructure::createFromModel($savedIvrMenu);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "ivr-menu/modify/{$savedIvrMenu->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Update IVR menu actions
     * @param string $ivrMenuId
     * @param array|string $actionsData
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
        if ($deletedActions && !$deletedActions->delete()) {
            throw new \Exception('Failed to delete old actions');
        }
    }
    
    /**
     * Sanitize actions data safely
     * @param array|string $actionsData
     * @return array
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
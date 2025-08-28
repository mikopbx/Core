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
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Services\ApiKeyValidationService;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for saving (creating or updating) API key record
 * 
 * @api {post} /pbxcore/api/v2/api-keys/saveRecord Save API key record
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup ApiKeys
 * 
 * @apiParam {String} [id] API key ID (for update)
 * @apiParam {String} description Description of the API key
 * @apiParam {String} [key] API key value (for new records)
 * @apiParam {Array} [allowed_paths] Array of allowed API paths
 * @apiParam {String} [networkfilterid] Network filter ID
 * @apiParam {Boolean} [full_permissions] Full permissions flag
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved record data
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save API key record (create new or update existing)
     * 
     * @param array $data Record data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        try {
            // Define sanitization rules
            $sanitizationRules = [
                'id' => FILTER_SANITIZE_NUMBER_INT,
                'description' => FILTER_SANITIZE_SPECIAL_CHARS,
                'key' => FILTER_DEFAULT,
                'networkfilterid' => FILTER_DEFAULT,
                'full_permissions' => FILTER_DEFAULT,
            ];
            
            // Sanitize input data including text fields
            $sanitizedData = self::sanitizeInputData(
                $data,
                $sanitizationRules,
                ['description']  // Text fields to process
            );
            
            // Handle allowed_paths separately (it's already an array)
            if (isset($data['allowed_paths'])) {
                $sanitizedData['allowed_paths'] = $data['allowed_paths'];
            }
            
            // Execute save in transaction
            $result = self::executeInTransaction(function() use ($sanitizedData) {
                // Find existing or create new
                if (!empty($sanitizedData['id'])) {
                    $apiKey = ApiKeys::findFirst($sanitizedData['id']);
                    if (!$apiKey) {
                        throw new \Exception('API key not found');
                    }
                    $isNew = false;
                } else {
                    $apiKey = new ApiKeys();
                    $isNew = true;
                }
                
                // Process API key for new records or regeneration
                if (!empty($sanitizedData['key'])) {
                    $apiKey->key_hash = password_hash($sanitizedData['key'], PASSWORD_BCRYPT);
                    $apiKey->key_suffix = substr($sanitizedData['key'], -4);
                    $apiKey->key_display = DataStructure::generateKeyDisplay($sanitizedData['key']);
                } elseif ($isNew) {
                    throw new \Exception('API key is required for new records');
                }
                
                // Update fields
                if (isset($sanitizedData['description'])) {
                    $apiKey->description = $sanitizedData['description'];
                }
                
                // Handle allowed_paths
                if (isset($sanitizedData['allowed_paths'])) {
                    if (is_array($sanitizedData['allowed_paths'])) {
                        $apiKey->allowed_paths = json_encode($sanitizedData['allowed_paths']);
                    } else {
                        $apiKey->allowed_paths = $sanitizedData['allowed_paths'];
                    }
                }
                
                // Handle network filter
                if (isset($sanitizedData['networkfilterid'])) {
                    $value = $sanitizedData['networkfilterid'];
                    $apiKey->networkfilterid = (!empty($value) && $value !== 'none') ? $value : null;
                }
                
                // Handle full_permissions boolean field
                if (isset($sanitizedData['full_permissions'])) {
                    $value = $sanitizedData['full_permissions'];
                    if (is_string($value)) {
                        $value = strtolower($value);
                        $apiKey->full_permissions = ($value === 'true' || $value === '1') ? '1' : '0';
                    } else {
                        $apiKey->full_permissions = $value ? '1' : '0';
                    }
                }
                
                // Save the record
                if (!$apiKey->save()) {
                    $errors = [];
                    foreach ($apiKey->getMessages() as $message) {
                        $errors[] = $message->getMessage();
                    }
                    throw new \Exception('Failed to save API key: ' . implode(', ', $errors));
                }
                
                // Clear validation cache for this key
                ApiKeyValidationService::clearCache((int)$apiKey->id);
                
                return $apiKey;
            });
            
            // Return success with updated data structure
            $res->data = DataStructure::createFromModel($result);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "api-keys/modify/{$result->id}";
            
            // Handle tab preservation if requested
            self::handleTabPreservation($data, $res);
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }
        
        return $res;
    }
}
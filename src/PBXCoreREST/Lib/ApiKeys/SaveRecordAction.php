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
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved record data
 */
class SaveRecordAction
{
    /**
     * Save API key record (create new or update existing)
     * 
     * @param array $data Record data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Find existing or create new
            if (!empty($data['id'])) {
                $apiKey = ApiKeys::findFirst($data['id']);
                if (!$apiKey) {
                    $res->messages['error'][] = 'API key not found';
                    return $res;
                }
            } else {
                $apiKey = new ApiKeys();
                
                // For new keys, hash the provided key
                if (!empty($data['key'])) {
                    $apiKey->key_hash = password_hash($data['key'], PASSWORD_BCRYPT);
                    $apiKey->key_suffix = substr($data['key'], -4);
                    $apiKey->key_display = self::generateKeyDisplay($data['key']);
                } else {
                    $res->messages['error'][] = 'API key is required for new records';
                    return $res;
                }
            }
            
            // Update fields
            if (isset($data['description'])) {
                $apiKey->description = $data['description'];
            }
            
            // Handle key regeneration for existing records
            if (!empty($data['key']) && !empty($apiKey->id)) {
                $apiKey->key_hash = password_hash($data['key'], PASSWORD_BCRYPT);
                // Update key suffix and display for identification
                $apiKey->key_suffix = substr($data['key'], -4);
                $apiKey->key_display = self::generateKeyDisplay($data['key']);
            }
            
            if (isset($data['allowed_paths'])) {
                // Ensure proper JSON encoding
                if (is_array($data['allowed_paths'])) {
                    $apiKey->allowed_paths = json_encode($data['allowed_paths']);
                } else {
                    $apiKey->allowed_paths = $data['allowed_paths'];
                }
            }
            
            if (isset($data['networkfilterid'])) {
                $apiKey->networkfilterid = (!empty($data['networkfilterid']) && $data['networkfilterid'] !== 'none') ? $data['networkfilterid'] : null;
            }
            
            if (isset($data['full_permissions'])) {
                // Handle both boolean and string values
                $value = $data['full_permissions'];
                if (is_string($value)) {
                    $value = strtolower($value);
                    $apiKey->full_permissions = ($value === 'true' || $value === '1') ? '1' : '0';
                } else {
                    $apiKey->full_permissions = $value ? '1' : '0';
                }
            }
            
            // Save
            if ($apiKey->save()) {
                // Clear cache for this key
                ApiKeyValidationService::clearCache((int)$apiKey->id);
                
                // Return updated data structure
                $dataStructure = DataStructure::createFromModel($apiKey);
                $res->data = $dataStructure->toArray();
                $res->success = true;
                
                // Add reload path for page refresh after save
                $res->reload = "api-keys/modify/{$apiKey->id}";
            } else {
                $res->messages['error'] = [];
                foreach ($apiKey->getMessages() as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
    
    /**
     * Generate key display representation (first 5 + ... + last 5 chars)
     * 
     * @param string $key The full API key
     * @return string Display representation
     */
    private static function generateKeyDisplay(string $key): string
    {
        if (strlen($key) <= 15) {
            // For short keys, show full key
            return $key;
        }
        
        return substr($key, 0, 5) . '...' . substr($key, -5);
    }
}
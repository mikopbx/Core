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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\ApiKeys\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    GenerateKeyAction,
    GetAvailableControllersAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for API keys management
 */
enum ApiKeyAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    
    // Custom methods
    case GENERATE_KEY = 'generateKey';
    case GET_AVAILABLE_CONTROLLERS = 'getAvailableControllers';
}

/**
 * API keys management processor
 *
 * Handles all API key management operations
 * 
 * RESTful API mapping:
 * - GET /api-keys         -> getList
 * - GET /api-keys/{id}    -> getRecord
 * - GET /api-keys:getDefault -> getDefault (returns new empty structure)
 * - POST /api-keys        -> create
 * - PUT /api-keys/{id}    -> update
 * - PATCH /api-keys/{id}  -> patch
 * - DELETE /api-keys/{id} -> delete
 * 
 * Custom methods:
 * - POST /api-keys:generateKey -> generateKey
 * - GET /api-keys:getAvailableControllers -> getAvailableControllers
 */
class ApiKeysManagementProcessor extends Injectable
{
    /**
     * Process API keys management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Try to match action with enum
        $action = ApiKeyAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            // Standard CRUD operations
            ApiKeyAction::GET_LIST => GetListAction::main($data),
            ApiKeyAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            ApiKeyAction::GET_DEFAULT => GetRecordAction::main(null), // New empty record
            ApiKeyAction::CREATE => SaveRecordAction::main($data), // Create new
            ApiKeyAction::UPDATE => SaveRecordAction::main($data), // Full update
            ApiKeyAction::PATCH => SaveRecordAction::main($data), // Partial update (same as update for now)
            ApiKeyAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            
            // Custom methods
            ApiKeyAction::GENERATE_KEY => GenerateKeyAction::main($data),
            ApiKeyAction::GET_AVAILABLE_CONTROLLERS => GetAvailableControllersAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
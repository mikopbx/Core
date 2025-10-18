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

use MikoPBX\PBXCoreREST\Lib\DialplanApplications\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\SaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\GetListAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\CopyRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for dialplan applications management
 */
enum DialplanApplicationAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    case SAVE_RECORD = 'saveRecord'; // Legacy support
    case DELETE_RECORD = 'deleteRecord'; // Legacy support

    // Custom methods
    case COPY = 'copy';
}

/**
 * Class DialplanApplicationsManagementProcessor
 * 
 * Processes dialplan application management requests using uniqid as primary identifier
 * 
 * RESTful API mapping:
 * - GET /dialplan-applications         -> getList
 * - GET /dialplan-applications/{id}    -> getRecord
 * - POST /dialplan-applications        -> create
 * - PUT /dialplan-applications/{id}    -> update
 * - PATCH /dialplan-applications/{id}  -> patch
 * - DELETE /dialplan-applications/{id} -> delete
 * 
 * Custom methods:
 * - GET /dialplan-applications:getDefault -> getDefault
 * - GET /dialplan-applications/{id}:copy  -> copy
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class DialplanApplicationsManagementProcessor extends Injectable
{
    /**
     * Processes DialplanApplications management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];

        // Pass HTTP method to actions for PUT/PATCH validation
        // WHY: PUT/PATCH on non-existent resource should return 404, not create new record
        if (isset($request['httpMethod'])) {
            $data['httpMethod'] = $request['httpMethod'];
        }

        // Type-safe action matching with enum
        $action = DialplanApplicationAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            DialplanApplicationAction::GET_LIST => GetListAction::main($data),
            DialplanApplicationAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            DialplanApplicationAction::GET_DEFAULT => GetDefaultAction::main(),
            DialplanApplicationAction::CREATE => CreateRecordAction::main($data),
            DialplanApplicationAction::UPDATE => UpdateRecordAction::main($data),
            DialplanApplicationAction::PATCH => PatchRecordAction::main($data),
            DialplanApplicationAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            
            // Legacy support
            DialplanApplicationAction::SAVE_RECORD => SaveRecordAction::main($data),
            DialplanApplicationAction::DELETE_RECORD => DeleteRecordAction::main($data['id'] ?? ''),
            
            // Custom methods
            DialplanApplicationAction::COPY => CopyRecordAction::main($data['id'] ?? '')
        };

        $res->function = $actionString;
        return $res;
    }
}
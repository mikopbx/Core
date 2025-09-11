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

use MikoPBX\PBXCoreREST\Lib\Employees\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\GetListAction;
use MikoPBX\PBXCoreREST\Lib\Employees\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\Employees\BatchCreateAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for employees management
 */
enum EmployeeAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    
    // Custom methods
    case BATCH_CREATE = 'batchCreate';
    case EXPORT = 'export';
    case IMPORT = 'import';
    case BATCH_DELETE = 'batchDelete';
    case ACTIVATE = 'activate';
    case DEACTIVATE = 'deactivate';
}

/**
 * Class EmployeesManagementProcessor
 * 
 * Processes employee management requests using user_id as primary identifier
 * while maintaining the same data structure as Extensions API
 * 
 * RESTful API mapping:
 * - GET /employees         -> getList
 * - GET /employees/{id}    -> getRecord
 * - POST /employees        -> create
 * - PUT /employees/{id}    -> update
 * - PATCH /employees/{id}  -> patch
 * - DELETE /employees/{id} -> delete
 * 
 * Custom methods:
 * - POST /employees:batchCreate  -> batchCreate
 * - POST /employees:export       -> export
 * - POST /employees:import       -> import
 * - POST /employees:batchDelete  -> batchDelete
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class EmployeesManagementProcessor extends Injectable
{
    /**
     * Processes Employees management requests with type-safe enum matching
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
        
        // Type-safe action matching with enum
        $action = EmployeeAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            EmployeeAction::GET_LIST => GetListAction::main($data),
            EmployeeAction::GET_RECORD => GetRecordAction::main($data['id'] ?? 'new'),
            EmployeeAction::CREATE => CreateRecordAction::main($data),
            EmployeeAction::UPDATE => UpdateRecordAction::main($data),
            EmployeeAction::PATCH => PatchRecordAction::main($data),
            EmployeeAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            
            // Custom methods
            EmployeeAction::BATCH_CREATE => BatchCreateAction::main($data),
            EmployeeAction::EXPORT => self::notImplemented('export'),
            EmployeeAction::IMPORT => self::notImplemented('import'),
            EmployeeAction::BATCH_DELETE => self::notImplemented('batchDelete'),
        };

        $res->function = $actionString;
        return $res;
    }
    
    /**
     * Placeholder for not yet implemented actions
     * 
     * @param string $action Action name
     * @return PBXApiResult
     */
    private static function notImplemented(string $action): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->messages['error'][] = "Action '$action' is not implemented yet";
        return $res;
    }
}
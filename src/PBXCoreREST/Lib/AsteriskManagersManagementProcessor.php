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

use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\GetListAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\PatchRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for Asterisk managers management
 */
enum AsteriskManagerAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
}

/**
 * Class AsteriskManagersManagementProcessor
 * 
 * Processes Asterisk manager (AMI users) management requests
 * 
 * RESTful API mapping:
 * - GET /asterisk-managers         -> getList
 * - GET /asterisk-managers/{id}    -> getRecord
 * - GET /asterisk-managers:getDefault -> getDefault
 * - POST /asterisk-managers        -> create
 * - PUT /asterisk-managers/{id}    -> update
 * - PATCH /asterisk-managers/{id}  -> patch
 * - DELETE /asterisk-managers/{id} -> delete
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class AsteriskManagersManagementProcessor extends Injectable
{
    /**
     * Processes Asterisk managers management requests with type-safe enum matching
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
        $action = AsteriskManagerAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            AsteriskManagerAction::GET_LIST => GetListAction::main($data),
            AsteriskManagerAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            AsteriskManagerAction::GET_DEFAULT => GetDefaultAction::main(),
            AsteriskManagerAction::CREATE => CreateRecordAction::main($data),
            AsteriskManagerAction::UPDATE => UpdateRecordAction::main($data),
            AsteriskManagerAction::PATCH => PatchRecordAction::main($data),
            AsteriskManagerAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}
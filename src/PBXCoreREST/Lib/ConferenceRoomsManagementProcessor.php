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

use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\GetListAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\DeleteRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for conference rooms management
 */
enum ConferenceRoomAction: string
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
 * Conference rooms management processor
 *
 * Handles all conference room management operations using RESTful CRUD operations (v3 API)
 * 
 * RESTful API mapping:
 * - GET /conference-rooms         -> getList
 * - GET /conference-rooms/{id}    -> getRecord
 * - GET /conference-rooms:getDefault -> getDefault
 * - POST /conference-rooms        -> create
 * - PUT /conference-rooms/{id}    -> update
 * - PATCH /conference-rooms/{id}  -> patch
 * - DELETE /conference-rooms/{id} -> delete
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ConferenceRoomsManagementProcessor extends Injectable
{
    /**
     * Processes conference room management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
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
        $action = ConferenceRoomAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            ConferenceRoomAction::GET_LIST => GetListAction::main($data),
            ConferenceRoomAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            ConferenceRoomAction::GET_DEFAULT => GetDefaultAction::main(),
            ConferenceRoomAction::CREATE => CreateRecordAction::main($data),
            ConferenceRoomAction::UPDATE => UpdateRecordAction::main($data),
            ConferenceRoomAction::PATCH => PatchRecordAction::main($data),
            ConferenceRoomAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}
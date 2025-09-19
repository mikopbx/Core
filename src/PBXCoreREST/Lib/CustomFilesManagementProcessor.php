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

use MikoPBX\PBXCoreREST\Lib\CustomFiles\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\GetListAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\PatchRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for custom files management
 */
enum CustomFileAction: string
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
 * Class CustomFilesManagementProcessor
 *
 * Processes custom files management requests using id as primary identifier
 *
 * RESTful API mapping:
 * - GET /custom-files         -> getList
 * - GET /custom-files/{id}    -> getRecord
 * - POST /custom-files        -> create
 * - PUT /custom-files/{id}    -> update
 * - PATCH /custom-files/{id}  -> patch
 * - DELETE /custom-files/{id} -> delete
 *
 * Custom methods:
 * - GET /custom-files:getDefault -> getDefault
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class CustomFilesManagementProcessor extends Injectable
{
    /**
     * Processes CustomFiles management requests with type-safe enum matching
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
        $action = CustomFileAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            CustomFileAction::GET_LIST => GetListAction::main($data),
            CustomFileAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            CustomFileAction::GET_DEFAULT => GetDefaultAction::main(),
            CustomFileAction::CREATE => CreateRecordAction::main($data),
            CustomFileAction::UPDATE => UpdateRecordAction::main($data),
            CustomFileAction::PATCH => PatchRecordAction::main($data),
            CustomFileAction::DELETE => DeleteRecordAction::main($data['id'] ?? '')
        };

        $res->function = $actionString;
        return $res;
    }
}
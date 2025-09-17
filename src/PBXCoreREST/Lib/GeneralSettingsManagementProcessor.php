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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\GeneralSettings\{
    GetListAction,
    GetRecordAction,
    GetDefaultAction,
    UpdateRecordAction,
    PatchRecordAction,
    UpdateCodecsAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for general settings management
 */
enum GeneralSettingsAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case UPDATE = 'update';
    case PATCH = 'patch';

    // Custom actions
    case UPDATE_CODECS = 'updateCodecs';
}

/**
 * General settings management processor (v3 API)
 *
 * Handles all general settings operations using RESTful CRUD operations:
 *
 * RESTful API mapping:
 * - GET /general-settings         -> getList (all settings)
 * - GET /general-settings/{key}   -> getRecord (single setting)
 * - GET /general-settings:getDefault -> getDefault (default values)
 * - PUT /general-settings         -> update (full update)
 * - PATCH /general-settings       -> patch (partial update)
 * - POST /general-settings:updateCodecs -> updateCodecs (codecs only)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class GeneralSettingsManagementProcessor extends Injectable
{
    /**
     * Process general settings requests with type-safe enum matching
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

        // Type-safe action matching with enum
        $action = GeneralSettingsAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            GeneralSettingsAction::GET_LIST => GetListAction::main($data),
            GeneralSettingsAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            GeneralSettingsAction::GET_DEFAULT => GetDefaultAction::main(),
            GeneralSettingsAction::UPDATE => UpdateRecordAction::main($data),
            GeneralSettingsAction::PATCH => PatchRecordAction::main($data),

            // Custom actions
            GeneralSettingsAction::UPDATE_CODECS => UpdateCodecsAction::main($data)
        };

        $res->function = $actionString;
        return $res;
    }
}
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

use MikoPBX\PBXCoreREST\Lib\Network\GetListAction;
use MikoPBX\PBXCoreREST\Lib\Network\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Network\GetConfigAction;
use MikoPBX\PBXCoreREST\Lib\Network\SaveConfigAction;
use MikoPBX\PBXCoreREST\Lib\Network\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\Network\GetNatSettingsAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for network management
 */
enum NetworkAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case DELETE = 'delete';

    // Custom operations
    case GET_CONFIG = 'getConfig';
    case SAVE_CONFIG = 'saveConfig';
    case GET_NAT_SETTINGS = 'getNatSettings';
}

/**
 * Network configuration management processor
 *
 * Handles all network configuration operations using RESTful CRUD operations (v3 API)
 *
 * RESTful API mapping:
 * - GET /network              -> getList
 * - GET /network/{id}         -> getRecord
 * - DELETE /network/{id}      -> delete
 * - GET /network:getConfig    -> getConfig
 * - POST /network:saveConfig  -> saveConfig
 * - GET /network:getNatSettings -> getNatSettings
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class NetworkManagementProcessor extends Injectable
{
    /**
     * Processes network management requests with type-safe enum matching
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
        $action = NetworkAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            NetworkAction::GET_LIST => GetListAction::main($data),
            NetworkAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            NetworkAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),

            // Custom operations
            NetworkAction::GET_CONFIG => GetConfigAction::main(),
            NetworkAction::SAVE_CONFIG => SaveConfigAction::main($data),
            NetworkAction::GET_NAT_SETTINGS => GetNatSettingsAction::main(),
        };

        $res->function = $actionString;
        return $res;
    }
}
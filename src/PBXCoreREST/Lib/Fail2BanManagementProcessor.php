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

use MikoPBX\PBXCoreREST\Lib\Fail2Ban\GetSettingsAction;
use MikoPBX\PBXCoreREST\Lib\Fail2Ban\UpdateSettingsAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for Fail2Ban management
 */
enum Fail2BanAction: string
{
    // Singleton standard methods
    case GET = 'get';
    case UPDATE = 'update';
    case PATCH = 'patch';

    // For singleton, getList returns the single resource
    case GET_LIST = 'getList';
}

/**
 * Fail2Ban management processor (Singleton resource)
 *
 * Handles all Fail2Ban management operations as a singleton resource
 * There's only one fail2ban configuration in the system
 *
 * RESTful API mapping:
 * - GET /fail2ban     -> get (retrieve current settings)
 * - PUT /fail2ban     -> update (fully update settings)
 * - PATCH /fail2ban   -> patch (partially update settings)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class Fail2BanManagementProcessor extends Injectable
{
    /**
     * Processes Fail2Ban management requests with type-safe enum matching
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
        $action = Fail2BanAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            Fail2BanAction::GET, Fail2BanAction::GET_LIST => GetSettingsAction::main(),
            Fail2BanAction::UPDATE, Fail2BanAction::PATCH => UpdateSettingsAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
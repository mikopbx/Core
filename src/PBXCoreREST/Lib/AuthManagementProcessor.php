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

use MikoPBX\PBXCoreREST\Lib\Auth\LoginAction;
use MikoPBX\PBXCoreREST\Lib\Auth\RefreshAction;
use MikoPBX\PBXCoreREST\Lib\Auth\LogoutAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for authentication management
 */
enum AuthAction: string
{
    case LOGIN = 'login';
    case REFRESH = 'refresh';
    case LOGOUT = 'logout';
}

/**
 * Class AuthManagementProcessor
 *
 * Processes authentication and token management requests
 *
 * RESTful API mapping:
 * - POST /auth:login   -> login   (PUBLIC)
 * - POST /auth:refresh -> refresh (PUBLIC, reads cookie)
 * - POST /auth:logout  -> logout  (BEARER_TOKEN required)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class AuthManagementProcessor extends Injectable
{
    /**
     * Processes authentication management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Validate action parameter
        if (!isset($request['action']) || !is_string($request['action'])) {
            $res->messages['error'][] = "Missing or invalid action parameter in " . __CLASS__;
            $res->function = '';
            return $res;
        }

        $actionString = $request['action'];

        // Validate data parameter
        if (!isset($request['data']) || !is_array($request['data'])) {
            $res->messages['error'][] = "Missing or invalid data parameter in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        $data = $request['data'];

        // Type-safe action matching with enum
        $action = AuthAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - {$actionString} in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            AuthAction::LOGIN => LoginAction::main($data),
            AuthAction::REFRESH => RefreshAction::main($data),
            AuthAction::LOGOUT => LogoutAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}

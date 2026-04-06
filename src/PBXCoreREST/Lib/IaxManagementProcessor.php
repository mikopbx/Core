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

use MikoPBX\PBXCoreREST\Lib\Iax\GetRegistryAction;
use Phalcon\Di\Injectable;

/**
 * IAX Management Processor
 *
 * Handles IAX-related API requests in the v3 REST API.
 * Processes requests for IAX providers registry and status management.
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class IaxManagementProcessor extends Injectable
{
    /**
     * Process the IAX management callback request.
     *
     * @param array $request The request data containing action and data
     * @return PBXApiResult An object containing the result of the API call
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'] ?? [];

        switch ($action) {
            case 'getRegistry':
                $res = GetRegistryAction::main($data);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
                break;
        }

        $res->function = $action;
        return $res;
    }
}
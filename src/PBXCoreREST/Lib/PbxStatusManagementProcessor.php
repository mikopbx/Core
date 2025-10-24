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

use MikoPBX\PBXCoreREST\Lib\PbxStatus\GetActiveCallsAction;
use MikoPBX\PBXCoreREST\Lib\PbxStatus\GetActiveChannelsAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for PBX Status monitoring
 */
enum PbxStatusAction: string
{
    // Real-time monitoring operations
    case GET_ACTIVE_CALLS = 'getActiveCalls';
    case GET_ACTIVE_CHANNELS = 'getActiveChannels';
}

/**
 * Class PbxStatusManagementProcessor
 *
 * Processes PBX Status (real-time monitoring) requests
 *
 * RESTful API mapping:
 * - GET /pbx-status:getActiveCalls      -> getActiveCalls
 * - GET /pbx-status:getActiveChannels   -> getActiveChannels
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class PbxStatusManagementProcessor extends Injectable
{
    /**
     * Processes PBX Status management requests with type-safe enum matching
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

        // Type-safe action matching with enum
        $action = PbxStatusAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            PbxStatusAction::GET_ACTIVE_CALLS => GetActiveCallsAction::main(),
            PbxStatusAction::GET_ACTIVE_CHANNELS => GetActiveChannelsAction::main(),
        };

        $res->function = $actionString;
        return $res;
    }
}

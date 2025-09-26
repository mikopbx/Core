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

use MikoPBX\PBXCoreREST\Lib\Cdr\GetListAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\GetActiveCallsAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\GetActiveChannelsAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\PlaybackAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for CDR management
 */
enum CdrAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';

    // CDR specific operations
    case GET_ACTIVE_CALLS = 'getActiveCalls';
    case GET_ACTIVE_CHANNELS = 'getActiveChannels';
    case PLAYBACK = 'playback';
}

/**
 * Class CdrManagementProcessor
 *
 * Processes CDR (Call Detail Records) management requests
 *
 * RESTful API mapping:
 * - GET /cdr                     -> getList
 * - GET /cdr/{id}                -> getRecord
 * - GET /cdr:getActiveCalls      -> getActiveCalls
 * - GET /cdr:getActiveChannels   -> getActiveChannels
 * - GET /cdr:playback            -> playback
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class CdrManagementProcessor extends Injectable
{
    /**
     * Processes CDR management requests with type-safe enum matching
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
        $action = CdrAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            CdrAction::GET_LIST => GetListAction::main($data),
            CdrAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),

            // CDR specific operations
            CdrAction::GET_ACTIVE_CALLS => GetActiveCallsAction::main(),
            CdrAction::GET_ACTIVE_CHANNELS => GetActiveChannelsAction::main(),
            CdrAction::PLAYBACK => PlaybackAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
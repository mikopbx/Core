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
use MikoPBX\PBXCoreREST\Lib\Cdr\GetMetadataAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\GetStatsByProviderAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\PlaybackAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\DownloadRecordAction;
use MikoPBX\PBXCoreREST\Lib\Cdr\DeleteRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for CDR management
 */
enum CdrAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case DELETE = 'delete';

    // CDR specific operations
    case GET_METADATA = 'getMetadata';
    case GET_STATS_BY_PROVIDER = 'getStatsByProvider';
    case PLAYBACK = 'playback';
    case DOWNLOAD = 'download';
}

/**
 * Class CdrManagementProcessor
 *
 * Processes CDR (Call Detail Records) management requests
 *
 * RESTful API mapping:
 * - GET /cdr                     -> getList
 * - GET /cdr/{id}                -> getRecord
 * - DELETE /cdr/{id}             -> delete
 * - GET /cdr:getMetadata         -> getMetadata
 * - GET /cdr:getStatsByProvider  -> getStatsByProvider
 * - GET /cdr/{id}:playback       -> playback
 * - GET /cdr/{id}:download       -> download
 *
 * Active calls/channels moved to /pbx-status API
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
        // WHY: Pass session context for ACL filtering in REST API
        // Contains role, user_name from JWT token - needed by modules like ModuleUsersUI
        $sessionContext = $request['sessionContext'] ?? [];

        // IMPORTANT: DataTables sends POST requests which are mapped to 'create' action
        // by BaseRestController, but we need to handle them as 'getList'
        // Detection: presence of 'draw' parameter indicates DataTables request
        if ($actionString === 'create' && isset($data['draw'])) {
            $actionString = 'getList';
        }

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
            // WHY: Pass sessionContext for ACL filtering (role from JWT token)
            CdrAction::GET_LIST => GetListAction::main($data, $sessionContext),
            CdrAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            CdrAction::DELETE => DeleteRecordAction::main($data['id'] ?? null, $data, $sessionContext),

            // CDR specific operations
            CdrAction::GET_METADATA => GetMetadataAction::main($data),
            CdrAction::GET_STATS_BY_PROVIDER => GetStatsByProviderAction::main($data),
            CdrAction::PLAYBACK => PlaybackAction::main($data),
            CdrAction::DOWNLOAD => DownloadRecordAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
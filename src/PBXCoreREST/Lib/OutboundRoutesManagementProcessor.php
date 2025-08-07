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

use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    ChangePriorityAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for outbound routes management.
 */
enum OutboundRouteAction: string
{
    case GET_RECORD = 'getRecord';
    case GET_LIST = 'getList';
    case SAVE_RECORD = 'saveRecord';
    case DELETE_RECORD = 'deleteRecord';
    case CHANGE_PRIORITY = 'changePriority';
}

/**
 * Outbound routes management processor.
 *
 * Handles all outbound route management operations including:
 * - getRecord: Get single outbound route by ID or create new structure
 * - getList: Get list of all outbound routes with provider data
 * - saveRecord: Create or update outbound route
 * - deleteRecord: Delete outbound route
 * - changePriority: Update priorities for multiple routes
 */
class OutboundRoutesManagementProcessor extends Injectable
{
    /**
     * Process outbound routes management requests.
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Try to match action with enum
        $action = OutboundRouteAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            OutboundRouteAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null, $data['copy-source'] ?? null),
            OutboundRouteAction::GET_LIST => GetListAction::main($data),
            OutboundRouteAction::SAVE_RECORD => SaveRecordAction::main($data),
            OutboundRouteAction::DELETE_RECORD => DeleteRecordAction::main($data['id'] ?? ''),
            OutboundRouteAction::CHANGE_PRIORITY => ChangePriorityAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
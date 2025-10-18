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

use MikoPBX\PBXCoreREST\Lib\IncomingRoutes\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    ChangePriorityAction,
    CopyRecordAction,
    GetDefaultRouteAction
};
use Phalcon\Di\Injectable;

/**
 * Incoming routes management processor (v3 API)
 *
 * Handles all incoming route management operations including:
 * - getRecord: Get single incoming route by ID
 * - getList: Get list of all incoming routes with provider and extension data
 * - getDefault: Get default values for new incoming route
 * - getDefaultRoute: Get or create the default route (ID=1)
 * - create: Create new incoming route
 * - update: Full update of incoming route (replace all fields)
 * - patch: Partial update of incoming route (modify specific fields)
 * - delete: Delete incoming route
 * - changePriority: Update priorities for multiple routes
 */
class IncomingRoutesManagementProcessor extends Injectable
{
    /**
     * Process incoming routes management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];

        // Pass HTTP method to actions for PUT/PATCH validation
        // WHY: PUT/PATCH on non-existent resource should return 404, not create new record
        if (isset($request['httpMethod'])) {
            $data['httpMethod'] = $request['httpMethod'];
        }

        // Map actions to handlers
        $res = match ($action) {
            // Standard CRUD operations
            'getRecord' => GetRecordAction::main($data['id'] ?? null),
            'getList' => GetListAction::main($data),
            'create' => SaveRecordAction::main($data),
            'update' => SaveRecordAction::main($data),
            'patch' => SaveRecordAction::main($data),
            'delete' => DeleteRecordAction::main($data['id'] ?? ''),

            // Custom methods
            'getDefault' => GetRecordAction::main(null),
            'getDefaultRoute' => GetDefaultRouteAction::main(),
            'changePriority' => ChangePriorityAction::main($data),
            'copy' => CopyRecordAction::main($data['id'] ?? ''),

            // Unknown action
            default => self::unknownAction($action)
        };

        $res->function = $action;
        return $res;
    }
    
    /**
     * Handle unknown action
     * 
     * @param string $action Unknown action name
     * @return PBXApiResult
     */
    private static function unknownAction(string $action): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        return $res;
    }
}
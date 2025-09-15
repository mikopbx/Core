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

use MikoPBX\PBXCoreREST\Lib\OutWorkTimes\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    ChangePriorityAction,
    CopyRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for out-of-work-time management
 */
enum OutWorkTimeAction: string
{
    case GET_RECORD = 'getRecord';
    case GET_LIST = 'getList';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    case CHANGE_PRIORITIES = 'changePriorities';
    case GET_DEFAULT = 'getDefault';
    case COPY = 'copy';
}

/**
 * Out-of-work-time management processor
 *
 * Handles all out-of-work-time management operations including:
 * - getRecord: Get single time condition by ID or create new structure
 * - getList: Get list of all time conditions with routing and calendar data
 * - create: Create new time condition
 * - update: Update time condition
 * - patch: Partially update time condition
 * - delete: Delete time condition
 * - changePriorities: Update priorities for multiple time conditions
 */
class OutWorkTimesManagementProcessor extends Injectable
{
    /**
     * Process out-of-work-time management requests
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
        $action = OutWorkTimeAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            OutWorkTimeAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            OutWorkTimeAction::GET_LIST => GetListAction::main($data),
            OutWorkTimeAction::CREATE => SaveRecordAction::main($data),
            OutWorkTimeAction::UPDATE => SaveRecordAction::main($data),
            OutWorkTimeAction::PATCH => SaveRecordAction::main($data),
            OutWorkTimeAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            OutWorkTimeAction::CHANGE_PRIORITIES => ChangePriorityAction::main($data),
            OutWorkTimeAction::GET_DEFAULT => GetRecordAction::main(null),
            OutWorkTimeAction::COPY => CopyRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}
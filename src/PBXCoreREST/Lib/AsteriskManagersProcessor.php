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

use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for Asterisk managers management.
 */
enum AsteriskManagerAction: string
{
    case GET_RECORD = 'getRecord';
    case GET_LIST = 'getList';
    case SAVE_RECORD = 'saveRecord';
    case DELETE_RECORD = 'deleteRecord';
}

/**
 * Asterisk managers processor.
 *
 * Handles all Asterisk manager operations including:
 * - getRecord: Get single manager by ID or create new structure
 * - getList: Get list of all managers
 * - saveRecord: Create or update manager
 * - deleteRecord: Delete manager
 */
class AsteriskManagersProcessor extends Injectable
{
    /**
     * Process Asterisk managers requests.
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
        $action = AsteriskManagerAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            AsteriskManagerAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            AsteriskManagerAction::GET_LIST => GetListAction::main($data),
            AsteriskManagerAction::SAVE_RECORD => SaveRecordAction::main($data),
            AsteriskManagerAction::DELETE_RECORD => DeleteRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}
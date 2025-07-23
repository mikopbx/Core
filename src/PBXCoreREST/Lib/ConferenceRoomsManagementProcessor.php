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

use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Conference rooms management processor
 *
 * Handles all conference room management operations including:
 * - getRecord: Get single conference room by ID or create new structure
 * - getList: Get list of all conference rooms
 * - saveRecord: Create or update conference room
 * - deleteRecord: Delete conference room
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ConferenceRoomsManagementProcessor extends Injectable
{
    /**
     * Processes conference room management requests
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
        
        switch ($action) {
            case 'getRecord':
                $recordId = $data['id'] ?? null;
                $res = GetRecordAction::main($recordId);
                break;
                
            case 'getList':
                $res = GetListAction::main($data);
                break;
                
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
                
            case 'deleteRecord':
                if (!empty($data['id'])) {
                    $res = DeleteRecordAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty ID in request data';
                }
                break;
                
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;
        return $res;
    }
}

<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Lib\IvrMenu\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * IVR menu management processor
 *
 * Handles all IVR menu management operations including:
 * - getRecord: Get single IVR menu by ID or create new structure
 * - getList: Get list of all IVR menus
 * - saveRecord: Create or update IVR menu
 * - deleteRecord: Delete IVR menu
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class IvrMenuManagementProcessor extends Injectable
{
    /**
     * Processes IVR menu management requests
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
        // For debugging purposes, use proper system logging instead of error_log:
        // SystemMessages::sysLogMsg(__CLASS__, "Processing action: {$action}", LOG_DEBUG);

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

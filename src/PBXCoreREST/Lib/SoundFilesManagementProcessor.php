<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Lib\SoundFiles\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    UploadFileAction,
    GetForSelectAction
};
use Phalcon\Di\Injectable;

/**
 * Sound files management processor
 *
 * Handles all sound file management operations including:
 * - getRecord: Get single sound file by ID or create new structure
 * - getList: Get list of all sound files
 * - saveRecord: Create or update sound file
 * - deleteRecord: Delete sound file
 * - uploadFile: Upload new sound file
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class SoundFilesManagementProcessor extends Injectable
{
    /**
     * Processes sound file management requests
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
                
            case 'uploadFile':
                $res = UploadFileAction::main($data);
                break;
                
            case 'getForSelect':
                $res = GetForSelectAction::main($data);
                break;
                
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;
        return $res;
    }
}
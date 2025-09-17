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

use MikoPBX\PBXCoreREST\Lib\SoundFiles\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\GetListAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\GetForSelectAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\UploadFileAction;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\PlaybackAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for sound files management
 */
enum SoundFileAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';

    // Custom methods
    case GET_FOR_SELECT = 'getForSelect';
    case UPLOAD_FILE = 'uploadFile';
    case PLAYBACK = 'playback';
}

/**
 * Class SoundFilesManagementProcessor
 *
 * Processes sound file management requests
 *
 * RESTful API mapping:
 * - GET /sound-files              -> getList
 * - GET /sound-files/{id}         -> getRecord
 * - POST /sound-files             -> create
 * - PUT /sound-files/{id}         -> update
 * - PATCH /sound-files/{id}       -> patch
 * - DELETE /sound-files/{id}      -> delete
 *
 * Custom methods:
 * - GET /sound-files:getDefault     -> getDefault
 * - GET /sound-files:getForSelect   -> getForSelect
 * - POST /sound-files:uploadFile    -> uploadFile
 * - GET /sound-files:playback       -> playback
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class SoundFilesManagementProcessor extends Injectable
{
    /**
     * Processes sound file management requests with type-safe enum matching
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
        $action = SoundFileAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            SoundFileAction::GET_LIST => GetListAction::main($data),
            SoundFileAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            SoundFileAction::GET_DEFAULT => GetDefaultAction::main(),
            SoundFileAction::CREATE => CreateRecordAction::main($data),
            SoundFileAction::UPDATE => UpdateRecordAction::main($data),
            SoundFileAction::PATCH => PatchRecordAction::main($data),
            SoundFileAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),

            // Custom methods
            SoundFileAction::GET_FOR_SELECT => GetForSelectAction::main($data),
            SoundFileAction::UPLOAD_FILE => UploadFileAction::main($data),
            SoundFileAction::PLAYBACK => PlaybackAction::main($data)
        };

        $res->function = $actionString;
        return $res;
    }
}
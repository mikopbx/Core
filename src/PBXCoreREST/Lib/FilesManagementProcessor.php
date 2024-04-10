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

use MikoPBX\PBXCoreREST\Lib\Files\DownloadNewFirmwareAction;
use MikoPBX\PBXCoreREST\Lib\Files\FirmwareDownloadStatusAction;
use MikoPBX\PBXCoreREST\Lib\Files\GetFileContentAction;
use MikoPBX\PBXCoreREST\Lib\Files\RemoveAudioFileAction;
use MikoPBX\PBXCoreREST\Lib\Files\StatusUploadFileAction;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFileAction;
use Phalcon\Di\Injectable;

/**
 * Class FilesManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class FilesManagementProcessor extends Injectable
{

    /**
     * Processes file upload requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $postData = $request['data'];
        switch ($action) {
            case 'uploadFile':
                $res = UploadFileAction::main($postData);
                break;
            case 'statusUploadFile':
                $upload_id = $postData['id'] ?? '';
                $res = StatusUploadFileAction::main($upload_id);
                break;
            case 'removeAudioFile':
                $res = RemoveAudioFileAction::main($postData['filename']);
                break;
            case 'getFileContent':
                $res = GetFileContentAction::main($postData['filename'], $postData['needOriginal'] === 'true');
                break;
            case 'downloadNewFirmware':
                $res = DownloadNewFirmwareAction::main($postData);
                break;
            case 'firmwareDownloadStatus':
                $res = FirmwareDownloadStatusAction::main($postData['filename']);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }

}
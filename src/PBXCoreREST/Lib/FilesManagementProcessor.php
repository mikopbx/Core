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

use MikoPBX\PBXCoreREST\Lib\Files\DownloadNewFirmware;
use MikoPBX\PBXCoreREST\Lib\Files\FirmwareDownloadStatus;
use MikoPBX\PBXCoreREST\Lib\Files\GetFileContent;
use MikoPBX\PBXCoreREST\Lib\Files\RemoveAudioFile;
use MikoPBX\PBXCoreREST\Lib\Files\StatusUploadFile;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFile;
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
                $res = UploadFile::main($postData);
                break;
            case 'statusUploadFile':
                $upload_id = $postData['id'] ?? '';
                $res = StatusUploadFile::main($upload_id);
                break;
            case 'removeAudioFile':
                $res = RemoveAudioFile::main($postData['filename']);
                break;
            case 'getFileContent':
                $res = GetFileContent::main($postData['filename'], $postData['needOriginal'] === 'true');
                break;
            case 'downloadNewFirmware':
                $res = DownloadNewFirmware::main($postData);
                break;
            case 'firmwareDownloadStatus':
                $res = FirmwareDownloadStatus::main($postData['filename']);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }

}
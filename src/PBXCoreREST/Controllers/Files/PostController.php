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

namespace MikoPBX\PBXCoreREST\Controllers\Files;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;

/**
 * Files management (POST).
 *
 * @RoutePrefix("/pbxcore/api/files")
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Files
 *
 * @examples
 *
 * Get config file content:
 *   curl -X POST -d '{"filename": "/etc/asterisk/asterisk.conf"}'
 *   http://172.16.156.212/pbxcore/api/files/getFileContent;
 *
 * Answer example:
 *   {"result":"ERROR","message":"API action not found;","function":"getFileContent"}
 *   {"result":"Success","data":"W2RpcmVj","function":"getFileContent"}
 *
 *
 * Delete Audio file:
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}'
 *   http://172.16.156.212/pbxcore/api/files/removeAudioFile;
 *
 *
 */
class PostController extends BaseController
{

    /**
     * Calls the corresponding action for file management based on the provided $actionName.
     *
     * @param string $actionName The name of the action.
     *
     * Get the content of config file by it name
     * @Post("/getFileContent")
     *
     * Delete audio files (mp3, wav, alaw ) by name its name.
     * @Post("/removeAudioFile")
     *
     * Upload files into the system by chunks.
     * @Post("/uploadFile")
     *
     * Returns Status of uploading and merging process.
     * @Post("/statusUpload")
     *
     * Downloads the firmware file from the provided URL.
     * @Post("/downloadNewFirmware")
     *
     * Get the progress status of the firmware file download.
     * @Post("/firmwareDownloadStatus")
     *
     * @return void
     */
    public function callAction(string $actionName=''): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        switch ($actionName) {
            case 'uploadFile':
                $this->uploadFile($requestData);
                break;
            default:
                $this->sendRequestToBackendWorker(FilesManagementProcessor::class, $actionName, $requestData );
        }
    }

    /**
     * Uploads files in chunks.
     *
     * @return void
     */
    private function uploadFile(array $requestData): void
    {
        if ($this->request->hasFiles() > 0) {
            $identifier = preg_replace(['#[/\\\\]#','/\.\./'], ['',''], $requestData['resumableIdentifier'])??'';
            $identifier = trim($identifier);
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $identifier)) {
                $this->sendError(Response::BAD_REQUEST, 'FILE Invalid identifier');
                return;
            }
            if (strlen($identifier) > 255) {
                $this->sendError(Response::BAD_REQUEST, 'FILE Identifier too long');
                return;
            }
            $requestData['resumableIdentifier'] = $identifier;

            foreach ($this->request->getUploadedFiles() as $file) {
                $requestData['files'][]= [
                    'file_path' => $file->getTempName(),
                    'file_size' => $file->getSize(),
                    'file_error'=> $file->getError(),
                    'file_name' => $file->getName(),
                    'file_type' => $file->getType()
                ];
                if ($file->getError()) {
                    $message = 'Error ' . $file->getError() . ' in file ' . $file->getTempName();
                    $this->sendError(Response::BAD_REQUEST, $message);
                    SystemMessages::sysLogMsg('UploadFile', $message, LOG_ERR);
                    return;
                }
            }
            usleep(100000);
        }

        $this->sendRequestToBackendWorker(FilesManagementProcessor::class, 'uploadFile', $requestData);
    }

}
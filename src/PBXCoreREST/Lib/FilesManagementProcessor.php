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
     * Processes file management requests for both legacy and v3 API
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
            // Legacy actions (maintain compatibility)
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
                $needOriginal = isset($postData['needOriginal']) && $postData['needOriginal'] === 'true';
                $res = GetFileContentAction::main($postData['filename'], $needOriginal);
                break;
            case 'downloadNewFirmware':
                $res = DownloadNewFirmwareAction::main($postData);
                break;
            case 'firmwareDownloadStatus':
                $res = FirmwareDownloadStatusAction::main($postData['filename']);
                break;

            // v3 RESTful actions
            case 'getRecord':
                // RESTful GET /files/{path} - get file content by path (ID is the file path)
                $filename = $postData['id'] ?? '';
                $needOriginal = isset($postData['needOriginal']) && $postData['needOriginal'] === 'true';
                $res = GetFileContentAction::main($filename, $needOriginal);
                break;
            case 'delete':
                // RESTful DELETE /files/{path} - delete file by path
                $filename = $postData['id'] ?? '';
                $res = RemoveAudioFileAction::main($filename);
                break;
            case 'update':
                // RESTful PUT /files/{path} - simple content upload
                $res = self::uploadFileContent($postData);
                break;
            case 'removeFile':
                // Legacy - RESTful DELETE /files/{path} - same as removeAudioFile but more generic
                $res = RemoveAudioFileAction::main($postData['filename']);
                break;
            case 'uploadFileContent':
                // Legacy - RESTful PUT /files/{path} - simple content upload
                $res = self::uploadFileContent($postData);
                break;
            case 'uploadStatus':
                // RESTful GET /files:uploadStatus?id={id}
                $upload_id = $postData['id'] ?? '';
                $res = StatusUploadFileAction::main($upload_id);
                break;
            case 'downloadFirmware':
                // RESTful POST /files:downloadFirmware
                $res = DownloadNewFirmwareAction::main($postData);
                break;
            case 'firmwareStatus':
                // RESTful GET /files:firmwareStatus?filename={name}
                $res = FirmwareDownloadStatusAction::main($postData['filename']);
                break;

            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Handle simple file content upload (PUT method)
     *
     * @param array $data Request data with filename/id and content
     * @return PBXApiResult
     */
    private static function uploadFileContent(array $data): PBXApiResult
    {
        $res = new PBXApiResult();

        // Support both 'id' (v3 RESTful) and 'filename' (legacy)
        $filename = $data['id'] ?? $data['filename'] ?? '';
        $content = $data['content'] ?? '';

        if (empty($filename)) {
            $res->messages['error'][] = 'Filename is required';
            return $res;
        }

        if (empty($content)) {
            $res->messages['error'][] = 'File content is required';
            return $res;
        }

        try {
            // Ensure directory exists
            $directory = dirname($filename);
            if (!is_dir($directory) && !mkdir($directory, 0755, true)) {
                $res->messages['error'][] = "Failed to create directory: $directory";
                return $res;
            }

            // Write file content
            $bytesWritten = file_put_contents($filename, $content);

            if ($bytesWritten === false) {
                $res->messages['error'][] = "Failed to write file: $filename";
                return $res;
            }

            $res->success = true;
            $res->data = [
                'filename' => $filename,
                'size' => $bytesWritten,
                'message' => 'File uploaded successfully'
            ];

        } catch (\Exception $e) {
            $res->messages['error'][] = "Upload failed: " . $e->getMessage();
        }

        return $res;
    }

}
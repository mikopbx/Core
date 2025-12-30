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

use MikoPBX\PBXCoreREST\Lib\Files\DownloadNewFirmwareAction;
use MikoPBX\PBXCoreREST\Lib\Files\FirmwareDownloadStatusAction;
use MikoPBX\PBXCoreREST\Lib\Files\GetFileContentAction;
use MikoPBX\PBXCoreREST\Lib\Files\RemoveAudioFileAction;
use MikoPBX\PBXCoreREST\Lib\Files\StatusUploadFileAction;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFileAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for file management
 */
enum FileAction: string
{
    // Standard RESTful operations
    case GET_RECORD = 'getRecord';           // GET /files/{path}
    case UPDATE = 'update';                  // PUT /files/{path}
    case DELETE = 'delete';                  // DELETE /files/{path}

    // Custom methods
    case UPLOAD_STATUS = 'uploadStatus';     // GET /files:uploadStatus
    case DOWNLOAD_FIRMWARE = 'downloadFirmware'; // POST /files:downloadFirmware
    case FIRMWARE_STATUS = 'firmwareStatus'; // GET /files:firmwareStatus

    // Legacy compatibility (deprecated - will be removed in future versions)
    case UPLOAD_FILE = 'uploadFile';         // @deprecated Use standard file upload
    case STATUS_UPLOAD_FILE = 'statusUploadFile'; // @deprecated Use uploadStatus
    case REMOVE_AUDIO_FILE = 'removeAudioFile';   // @deprecated Use delete
    case GET_FILE_CONTENT = 'getFileContent';     // @deprecated Use getRecord
    case DOWNLOAD_NEW_FIRMWARE = 'downloadNewFirmware'; // @deprecated Use downloadFirmware
    case FIRMWARE_DOWNLOAD_STATUS = 'firmwareDownloadStatus'; // @deprecated Use firmwareStatus
    case REMOVE_FILE = 'removeFile';         // @deprecated Use delete
    case UPLOAD_FILE_CONTENT = 'uploadFileContent'; // @deprecated Use update
}

/**
 * Class FilesManagementProcessor
 *
 * Processes file management requests for v3 REST API with legacy compatibility
 *
 * RESTful API mapping:
 * - GET /files/{path}              -> getRecord
 * - PUT /files/{path}              -> update
 * - DELETE /files/{path}           -> delete
 *
 * Custom methods:
 * - GET /files:uploadStatus        -> uploadStatus
 * - POST /files:downloadFirmware   -> downloadFirmware
 * - GET /files:firmwareStatus      -> firmwareStatus
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class FilesManagementProcessor extends Injectable
{
    /**
     * Processes file management requests with type-safe enum matching
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
        $action = FileAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard RESTful operations
            FileAction::GET_RECORD,
            FileAction::GET_FILE_CONTENT => self::getFileContent($data),

            FileAction::UPDATE,
            FileAction::UPLOAD_FILE_CONTENT => self::uploadFileContent($data),

            FileAction::DELETE,
            FileAction::REMOVE_AUDIO_FILE,
            FileAction::REMOVE_FILE => self::deleteFile($data),

            // Custom methods
            FileAction::UPLOAD_STATUS,
            FileAction::STATUS_UPLOAD_FILE => self::getUploadStatus($data),

            FileAction::DOWNLOAD_FIRMWARE,
            FileAction::DOWNLOAD_NEW_FIRMWARE => DownloadNewFirmwareAction::main($data),

            FileAction::FIRMWARE_STATUS,
            FileAction::FIRMWARE_DOWNLOAD_STATUS => self::getFirmwareStatus($data),

            // Chunked upload (handled separately)
            FileAction::UPLOAD_FILE => UploadFileAction::main($data)
        };

        $res->function = $actionString;
        return $res;
    }

    /**
     * Get file content by path
     *
     * @param array<string, mixed> $data Request data with id/filename and needOriginal
     * @return PBXApiResult
     */
    private static function getFileContent(array $data): PBXApiResult
    {
        // Support both 'id' (v3 RESTful) and 'filename' (legacy)
        $filename = $data['id'] ?? $data['filename'] ?? '';
        $needOriginal = isset($data['needOriginal']) && $data['needOriginal'] === 'true';

        return GetFileContentAction::main($filename, $needOriginal);
    }

    /**
     * Delete file by path
     *
     * @param array<string, mixed> $data Request data with id/filename
     * @return PBXApiResult
     */
    private static function deleteFile(array $data): PBXApiResult
    {
        // Support both 'id' (v3 RESTful) and 'filename' (legacy)
        $filename = $data['id'] ?? $data['filename'] ?? '';

        // Normalize the file path (add leading slash if missing)
        if (!empty($filename) && !str_starts_with($filename, '/')) {
            $filename = '/' . $filename;
        }

        return RemoveAudioFileAction::main($filename);
    }

    /**
     * Get upload status
     *
     * @param array<string, mixed> $data Request data with upload id
     * @return PBXApiResult
     */
    private static function getUploadStatus(array $data): PBXApiResult
    {
        $uploadId = $data['id'] ?? '';

        return StatusUploadFileAction::main($uploadId);
    }

    /**
     * Get firmware download status
     *
     * @param array<string, mixed> $data Request data with filename
     * @return PBXApiResult
     */
    private static function getFirmwareStatus(array $data): PBXApiResult
    {
        $filename = $data['filename'] ?? '';

        return FirmwareDownloadStatusAction::main($filename);
    }

    /**
     * Handle simple file content upload (PUT method)
     *
     * @param array<string, mixed> $data Request data with filename/id and content
     * @return PBXApiResult
     */
    private static function uploadFileContent(array $data): PBXApiResult
    {
        $res = new PBXApiResult();

        // Support both 'id' (v3 RESTful) and 'filename' (legacy)
        $filename = $data['id'] ?? $data['filename'] ?? '';
        $content = $data['content'] ?? '';

        // Normalize the file path (add leading slash if missing)
        // WHY: URL path like 'tmp/file.txt' should become '/tmp/file.txt'
        //      to match GetFileContentAction behavior and create files in correct location
        if (!empty($filename) && !str_starts_with($filename, '/')) {
            $filename = '/' . $filename;
        }

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
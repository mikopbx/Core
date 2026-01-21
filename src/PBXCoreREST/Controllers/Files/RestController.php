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
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Files\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for file management (v3 API)
 *
 * Files API is a hybrid resource that works with filesystem operations rather than database entities.
 * It combines standard REST operations for file CRUD with custom methods for specialized operations.
 *
 * @RoutePrefix("/pbxcore/api/v3/files")
 *
 * @examples Standard REST operations:
 *
 * # Get file content by path
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/files/etc/asterisk/asterisk.conf
 *
 * # Delete file by path
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/files/storage/usbdisk1/mikopbx/tmp/audio.wav
 *
 * # Upload file content (simple upload)
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/files/tmp/config.txt \
 *      -H "Content-Type: text/plain" \
 *      -d "file content here"
 *
 * @examples Custom method operations:
 *
 * # Chunked file upload (Resumable.js)
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/files:upload \
 *      -F "file=@chunk.bin" \
 *      -F "resumableIdentifier=12345" \
 *      -F "resumableChunkNumber=1"
 *
 * # Check upload status
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/files:uploadStatus?id=12345
 *
 * # Download firmware from external URL
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/files:downloadFirmware \
 *      -H "Content-Type: application/json" \
 *      -d '{"url":"https://example.com/firmware.img","md5":"abc123"}'
 *
 * # Check firmware download status
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/files:firmwareStatus?filename=firmware.img
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Files
 */
#[ApiResource(
    path: '/pbxcore/api/v3/files',    
    tags: ['FilesManagement'],
    description: 'rest_Files_ApiDescription',
    processor: FilesManagementProcessor::class
)]
#[ResourceSecurity(
    'files',
    requirements: [SecurityType::BEARER_TOKEN],
    description: 'rest_security_bearer'
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getRecord', 'uploadStatus', 'firmwareStatus'],
        'PUT' => ['update'],
        'DELETE' => ['delete'],
        'POST' => ['upload', 'downloadFirmware']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'delete'],
    collectionLevelMethods: [],
    customMethods: ['upload', 'uploadStatus', 'downloadFirmware', 'firmwareStatus'],
    idPattern: '.+'  // Allow any file path as ID
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = FilesManagementProcessor::class;

    /**
     * Get file content by path
     *
     * Retrieves the content of a file specified by its path.
     * The path should be URL-encoded to handle special characters.
     *
     * @route GET /pbxcore/api/v3/files/{id}
     */
    #[ApiOperation(
        summary: 'rest_file_GetRecord',
        description: 'rest_file_GetRecordDesc',
        operationId: 'getFileContent'
    )]
    #[ApiParameterRef('id', example: 'etc/asterisk/asterisk.conf')]
    #[ApiResponse(200, 'rest_response_200_file_content')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Upload or update file content (simple upload)
     *
     * Uploads file content using PUT method with raw body.
     * Suitable for simple file uploads without chunking.
     *
     * @route PUT /pbxcore/api/v3/files/{id}
     */
    #[ApiOperation(
        summary: 'rest_file_Update',
        description: 'rest_file_UpdateDesc',
        operationId: 'uploadFileContent'
    )]
    #[ApiParameterRef('id', example: 'tmp/config.txt')]
    #[ApiResponse(200, 'rest_response_200_uploaded')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete file by path
     *
     * Removes a file from the filesystem.
     * The path should be URL-encoded.
     *
     * @route DELETE /pbxcore/api/v3/files/{id}
     */
    #[ApiOperation(
        summary: 'rest_file_Delete',
        description: 'rest_file_DeleteDesc',
        operationId: 'deleteFile'
    )]
    #[ApiParameterRef('id', example: 'storage/usbdisk1/mikopbx/tmp/audio.wav')]
    #[ApiResponse(204, 'rest_response_204_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Upload file in chunks (Resumable.js protocol)
     *
     * Handles chunked file uploads compatible with Resumable.js library.
     * Supports large file uploads by splitting into smaller chunks.
     *
     * @route POST /pbxcore/api/v3/files:upload
     */
    #[ApiOperation(
        summary: 'rest_file_Upload',
        description: 'rest_file_UploadDesc',
        operationId: 'uploadFileChunked'
    )]
    #[ApiParameterRef('resumableIdentifier', required: true)]
    #[ApiParameterRef('resumableChunkNumber', required: true)]
    #[ApiParameterRef('resumableTotalChunks', required: true)]
    #[ApiParameterRef('resumableFilename', required: true)]
    #[ApiResponse(200, 'rest_response_200_chunk_uploaded')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function upload(): void
    {
        $this->handleChunkedUpload();
    }

    /**
     * Check upload status
     *
     * Retrieves the current status of a chunked file upload.
     * Used by Resumable.js to determine which chunks have been uploaded.
     *
     * Note: Accepts both 'resumableIdentifier' (preferred) and 'id' (legacy) for backward compatibility.
     *
     * @route GET /pbxcore/api/v3/files:uploadStatus
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_file_UploadStatus',
        description: 'rest_file_UploadStatusDesc',
        operationId: 'getUploadStatus'
    )]
    #[ApiParameterRef('resumableIdentifier', required: true)]
    #[ApiResponse(200, 'rest_response_200_upload_status')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function uploadStatus(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Download firmware from external URL
     *
     * Initiates download of firmware file from a remote URL.
     * Supports optional MD5 checksum verification.
     *
     * @route POST /pbxcore/api/v3/files:downloadFirmware
     */
    #[ApiOperation(
        summary: 'rest_file_DownloadFirmware',
        description: 'rest_file_DownloadFirmwareDesc',
        operationId: 'downloadFirmware'
    )]
    #[ApiParameterRef('url', required: true)]
    #[ApiParameterRef('md5')]
    #[ApiResponse(200, 'rest_response_200_firmware_downloading')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function downloadFirmware(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check firmware download status
     *
     * Retrieves the current status of a firmware download operation.
     * Returns progress information and completion status.
     *
     * @route GET /pbxcore/api/v3/files:firmwareStatus
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_file_FirmwareStatus',
        description: 'rest_file_FirmwareStatusDesc',
        operationId: 'getFirmwareDownloadStatus'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiResponse(200, 'rest_response_200_firmware_status')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function firmwareStatus(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Override handleCustomRequest to route custom methods to controller methods
     *
     * For Files controller, custom methods like 'upload' should call controller methods
     * (which prepare file data) before sending to worker, not send directly to worker.
     *
     * @param string|null $idOrMethod
     * @param string|null $customMethod
     * @return void
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        // Determine the actual method name
        $actualMethod = $customMethod ?? $idOrMethod;

        // If a corresponding public method exists in this controller, call it
        if ($actualMethod && method_exists($this, $actualMethod) && (new \ReflectionMethod($this, $actualMethod))->isPublic()) {
            $this->$actualMethod();
            return;
        }

        // Otherwise, use default behavior (send directly to worker)
        parent::handleCustomRequest($idOrMethod, $customMethod);
    }

    /**
     * Handle chunked file upload (Resumable.js support)
     *
     * @return void
     */
    private function handleChunkedUpload(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Process uploaded files
        if ($this->request->hasFiles() > 0) {
            $identifier = preg_replace(['#[/\\\\]#','/\.\./'], ['',''], $requestData['resumableIdentifier'])??'';
            $identifier = trim($identifier);

            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $identifier)) {
                $this->sendErrorResponse('Invalid identifier', 400);
                return;
            }

            if (strlen($identifier) > 255) {
                $this->sendErrorResponse('Identifier too long', 400);
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
                    $this->sendErrorResponse($message, 400);
                    SystemMessages::sysLogMsg('UploadFile', $message, LOG_ERR);
                    return;
                }
            }

            usleep(100000); // Brief delay as in original implementation
        }

        // Send to backend worker with 'uploadFile' action (legacy action name)
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'uploadFile',
            $requestData
        );
    }
}

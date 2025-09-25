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
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;

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
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = FilesManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['uploadStatus', 'firmwareStatus'],
            'POST' => ['upload', 'downloadFirmware']
        ];
    }

    /**
     * Override to handle file path parameters and custom upload logic
     *
     * @param string|null $id File path (URL encoded)
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Validate processor class is set
        if (empty($this->processorClass)) {
            $this->sendErrorResponse('Processor class not configured', 500);
            return;
        }

        // Get HTTP method and sanitize data
        $httpMethod = $this->request->getMethod();
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Handle file path parameter
        if (!empty($id)) {
            // Decode URL-encoded file path
            $filePath = urldecode($id);

            // Security: Validate file path to prevent directory traversal
            if (!$this->isValidFilePath($filePath)) {
                $this->sendErrorResponse('Invalid file path', 400);
                return;
            }

            $requestData['filename'] = $filePath;
        }

        // Map HTTP method to action
        $action = match($httpMethod) {
            'GET' => 'getFileContent',
            'PUT' => 'uploadFile',      // Simple file upload
            'DELETE' => 'removeFile',   // File deletion
            default => null
        };

        if ($action === null) {
            $this->sendErrorResponse("Invalid HTTP method: $httpMethod", 405);
            return;
        }

        // For PUT requests, handle simple file upload
        if ($httpMethod === 'PUT' && !empty($requestData['filename'])) {
            $this->handleSimpleUpload($requestData);
            return;
        }

        // Send request to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $action,
            $requestData
        );
    }

    /**
     * Override to handle chunked upload with file validation
     *
     * @param string|null $idOrMethod ID or custom method name
     * @param string|null $customMethod Custom method name (when ID is provided)
     * @return void
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        // Determine the actual custom method
        $method = $customMethod ?? $idOrMethod;

        // Handle upload method specially due to multipart/form-data
        if ($method === 'upload' && $this->request->getMethod() === 'POST') {
            $this->handleChunkedUpload();
            return;
        }

        // Use parent implementation for other custom methods
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

        // Send to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'uploadFile',
            $requestData
        );
    }

    /**
     * Handle simple file upload via PUT method
     *
     * @param array $requestData Request data including filename
     * @return void
     */
    private function handleSimpleUpload(array $requestData): void
    {
        // Get raw body content for PUT upload
        $content = $this->request->getRawBody();

        if (empty($content)) {
            $this->sendErrorResponse('No file content provided', 400);
            return;
        }

        // Add content to request data
        $requestData['content'] = $content;
        $requestData['contentType'] = $this->request->getContentType();

        // Send to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'uploadFileContent',
            $requestData
        );
    }

    /**
     * Validate file path to prevent directory traversal attacks
     *
     * @param string $filePath File path to validate
     * @return bool True if path is valid
     */
    private function isValidFilePath(string $filePath): bool
    {
        // Check for directory traversal patterns
        if (strpos($filePath, '..') !== false) {
            return false;
        }

        // Check for null bytes
        if (strpos($filePath, "\0") !== false) {
            return false;
        }

        // Path should not be empty
        if (empty(trim($filePath))) {
            return false;
        }

        // Additional security checks can be added here
        return true;
    }
}
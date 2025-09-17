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

namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;
use MikoPBX\PBXCoreREST\Services\AudioFileService;

/**
 * RESTful controller for sound files management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/sound-files")
 *
 * @examples Standard CRUD operations:
 *
 * # List all sound files with filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/sound-files?category=custom"
 *
 * # Get specific sound file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sound-files/123
 *
 * # Create new sound file metadata
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/sound-files \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Welcome Message","category":"custom","path":"/tmp/welcome.wav"}'
 *
 * # Full update (replace) sound file metadata
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/sound-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Updated Welcome","category":"custom","path":"/tmp/welcome2.wav"}'
 *
 * # Partial update (modify) sound file metadata
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/sound-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"New Name"}'
 *
 * # Delete sound file
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/sound-files/123
 *
 * @examples Custom method operations:
 *
 * # Get default values for new sound file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sound-files:getDefault
 *
 * # Upload sound file (used with Resumable.js)
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/sound-files:uploadFile \
 *      -H "Content-Type: multipart/form-data" \
 *      -F "file=@audio.wav"
 *
 * # Get sound files for dropdown select
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/sound-files:getForSelect?category=moh"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SoundFilesManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'getForSelect', 'playback'],
            'POST' => ['uploadFile']
        ];
    }

    /**
     * Override handleCustomRequest to handle playback with file streaming
     *
     * @param string|null $idOrMethod Either the ID (for resource routes) or method (for collection routes)
     * @param string|null $customMethod The custom method name (for resource routes) or null (for collection routes)
     * @return void
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        // Determine the actual method
        $actualMethod = $customMethod !== null ? $customMethod : $idOrMethod;

        // Special handling for playback - get path from processor first, then stream directly
        if ($actualMethod === 'playback') {
            $this->handlePlaybackRequest();
            return;
        }

        // For all other custom methods, use parent implementation
        parent::handleCustomRequest($idOrMethod, $customMethod);
    }

    /**
     * Handle playback request with two-phase approach:
     * 1. Get validated file path from processor (may involve S3, path translation, etc.)
     * 2. Stream file directly if path is valid
     *
     * @return void
     */
    private function handlePlaybackRequest(): void
    {
        // Get sanitized request data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Phase 1: Call processor to validate and get real file path
        // This allows processor to:
        // - Validate access permissions
        // - Translate paths (e.g., from database to filesystem)
        // - Get files from S3 or other storage
        // - Apply business logic
        $processor = new SoundFilesManagementProcessor();
        $result = $processor::callBack([
            'action' => 'playback',
            'data' => $requestData
        ]);

        // Check if processor returned success
        if (!$result->success) {
            $this->response->setPayloadError($result->messages);
            return;
        }

        // Phase 2: Handle file streaming if processor returned file data
        if (isset($result->data['fpassthru'])) {
            $this->handleFilePassThrough($result->data['fpassthru']);
        } else {
            // Fallback to standard JSON response
            $this->response->setPayloadSuccess($result->getResult());
        }
    }

    /**
     * Stream file to client with proper headers
     * Based on ModulesControllerBase implementation
     *
     * @param array $data File data from processor
     * @return void
     */
    private function handleFilePassThrough(array $data): void
    {
        $filename = $data['filename'] ?? '';

        if (!file_exists($filename)) {
            $this->response->setStatusCode(404, 'Not Found');
            $this->response->send();
            return;
        }

        $fp = fopen($filename, "rb");
        if ($fp === false) {
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->send();
            return;
        }

        $size = filesize($filename);
        $contentType = $data['content_type'] ?? 'application/octet-stream';

        // Set appropriate headers
        $this->response->setHeader('Content-Type', $contentType);
        $this->response->setHeader('Content-Transfer-Encoding', 'binary');
        $this->response->setContentLength($size);

        // Handle download mode
        if (!empty($data['download_name'])) {
            $this->response->setHeader('Content-Disposition',
                'attachment; filename="' . $data['download_name'] . '"');
        } else {
            // For inline playback
            $this->response->setHeader('Content-Disposition', 'inline');
        }

        // Send headers and stream file
        $this->response->sendHeaders();
        fpassthru($fp);
        fclose($fp);

        // Clean up if needed
        if (!empty($data['need_delete'])) {
            unlink($filename);
        }
    }
}
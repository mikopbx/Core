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

namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;
use MikoPBX\PBXCoreREST\Services\AudioFileService;

/**
 * GET controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getRecord/123
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getList
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getList?category=moh
 * 
 * Playback sound file with range support:
 * curl -H "Range: bytes=0-1024" http://127.0.0.1/pbxcore/api/v2/sound-files/playback?view=/storage/usbdisk1/mikopbx/media/custom/moh.mp3
 * 
 * Download sound file:
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/playback?view=/path/to/sound.mp3&download=true&filename=music.mp3
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class GetController extends BaseController
{
    private AudioFileService $audioService;

    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get sound file record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all sound files
     * @Get("/getList")
     * 
     * Stream sound file with HTTP Range support (MOH, IVR, system sounds)
     * @Get("/playback")
     * 
     * @param string $actionName
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        // Handle direct file streaming for sound files (not CDR)
        if ($actionName === 'playback') {
            $this->audioService = new AudioFileService();
            $this->handleSoundFilePlayback();
            return;
        }
        
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        if (!empty($id)){
            $requestData['id'] = $id;
        }
        
        // Send request to Worker
        $this->sendRequestToBackendWorker(
            SoundFilesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }

    /**
     * Handles playback of sound files (MOH, IVR, system sounds)
     * 
     * This endpoint is specifically for non-CDR audio files.
     * For call recordings, use /pbxcore/api/cdr/playback endpoint.
     * 
     * Supports:
     * - HTTP Range requests for audio streaming
     * - Force download with custom filename
     * - Direct file serving through Nginx for performance
     * 
     * @return void
     */
    private function handleSoundFilePlayback(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $filename = $requestData['view'] ?? '';
        
        // Validate file parameter
        if (empty($filename)) {
            $this->sendError(Response::NOT_FOUND, 'Empty filename');
            return;
        }
        
        // Validate this is not a CDR recording (security check)
        if ($this->isCallRecording($filename)) {
            $this->response->setHeader('X-Redirect-To', '/pbxcore/api/cdr/playback');
            $this->sendError(Response::BAD_REQUEST, 'Use CDR endpoint for call recordings');
            return;
        }
        
        // Extract request parameters
        $rangeHeader = $_SERVER['HTTP_RANGE'] ?? null;
        $isDownload = !empty($requestData['download']);
        $customName = $requestData['filename'] ?? null;
        
        // Process file streaming through dedicated service
        $result = $this->audioService->streamFile($filename, $rangeHeader, $isDownload, $customName);
        
        // Handle streaming errors
        if (isset($result['error'])) {
            $this->sendError($result['error'], $result['message'] ?? '');
            return;
        }
        
        // Apply response headers
        $this->applyHeaders($result['headers']);
        
        // Send response based on request type
        if (isset($result['content'])) {
            // Partial content response for range requests
            $this->response->setRawHeader("HTTP/1.1 {$result['status']} Partial Content");
            $this->response->setContent($result['content']);
        } elseif (isset($result['file'])) {
            // Full file response
            $this->response->setStatusCode($result['status']);
            $this->response->setFileToSend($result['file']);
        }
        
        $this->response->sendRaw();
    }
    
    /**
     * Checks if the file path is a call recording
     * 
     * @param string $path File path to check
     * @return bool True if this is a CDR recording
     */
    private function isCallRecording(string $path): bool
    {
        return str_contains($path, '/monitor/') || 
               str_contains($path, '/voicemail/') ||
               str_contains($path, '/voicemailarchive/');
    }
    
    /**
     * Applies HTTP headers to the response object
     * 
     * @param array $headers Associative array of header names and values
     * @return void
     */
    private function applyHeaders(array $headers): void
    {
        // Clear any existing headers
        $this->response->resetHeaders();
        
        // Apply each header with special handling for Content-Length
        foreach ($headers as $name => $value) {
            if ($name === 'Content-Length') {
                // Use dedicated method for content length
                $this->response->setContentLength($value);
            } else {
                // Standard header setting
                $this->response->setHeader($name, $value);
            }
        }
    }
}
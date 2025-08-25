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

namespace MikoPBX\PBXCoreREST\Controllers\Cdr;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\CdrDBProcessor;
use MikoPBX\PBXCoreREST\Services\AudioFileService;

/**
 * CDR API Controller for handling Call Detail Records operations
 * 
 * This controller handles CDR-related API endpoints including:
 * - Retrieving active channels and calls from the PBX
 * - Streaming audio recordings with HTTP Range support
 * - Direct file playback without Redis queue for optimal performance
 * 
 * @RoutePrefix("/pbxcore/api/cdr")
 * @package MikoPBX\PBXCoreREST\Controllers\Cdr
 * 
 * @examples
 * Get active channels:
 * curl http://127.0.0.1/pbxcore/api/cdr/getActiveChannels
 * 
 * * Example response:
 * [{"start":"2018-02-27 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}]
 *
 * The response is an array of arrays with the following fields:
 * "start"     => 'TEXT',     // DateTime
 * "answer"    => 'TEXT',     // DateTime
 * "endtime"   => 'TEXT',     // DateTime
 * "src_num"   => 'TEXT',
 * "dst_num"   => 'TEXT',
 * "linkedid"  => 'TEXT',
 * "did"       => 'TEXT'
 * 
 * Stream audio file with range support:
 * curl -H "Range: bytes=0-1024" http://127.0.0.1/pbxcore/api/cdr/playback?view=/path/to/recording.mp3
 * 
 * Download recording:
 * curl http://127.0.0.1/pbxcore/api/cdr/playback?view=/path/to/recording.mp3&download=true&filename=call.mp3
 */
class GetController extends BaseController
{
    private AudioFileService $audioService;

    /**
     * Routes incoming requests to appropriate action handlers
     * 
     * Note: File streaming operations are handled directly in the controller
     * without Redis queue to ensure optimal performance and support for
     * HTTP Range requests which require synchronous processing.
     *
     * @param string $actionName The action to execute
     * 
     * @Get("/getActiveChannels") - Get list of active channels
     * @Get("/getActiveCalls") - Get list of active calls  
     * @Get("/playback") - Stream audio file with range support
     * @Get("/v2/playback") - Nginx-optimized playback endpoint
     * @Get("/v2/getRecordFile") - Direct file access endpoint
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Initialize audio service for playback operations
        if ($actionName === 'playback') {
            $this->audioService = new AudioFileService();
        }
        
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        // Route to appropriate handler based on action
        match ($actionName) {
            // Direct file streaming - handled synchronously for performance
            'playback' => $this->handlePlayback($requestData),
            
            // Nginx-optimized endpoint - just return OK status
            'getRecordFile' => $this->response->setStatusCode(Response::OK),
            
            // Database queries - sent to background worker via Redis
            default => $this->sendRequestToBackendWorker(
                CdrDBProcessor::class, 
                $actionName, 
                $requestData
            ),
        };
    }

    /**
     * Handles audio file playback with HTTP Range support
     * 
     * This method processes playback requests for audio recordings,
     * supporting partial content requests (HTTP 206) for audio scrubbing
     * and efficient streaming of large files.
     * 
     * @param array $requestData Request parameters including:
     *                          - view: Path to the audio file
     *                          - download: Force download flag (optional)
     *                          - filename: Custom download name (optional)
     * 
     * @return void
     */
    private function handlePlayback(array $requestData): void
    {
        $filename = $requestData['view'] ?? '';
        
        // Validate file parameter
        if (empty($filename)) {
            $this->sendError(Response::NOT_FOUND, 'Empty filename');
            return;
        }
        
        // Check if this is actually a CDR recording or other sound file
        if (!$this->isCallRecording($filename)) {
            // Log deprecated usage for monitoring
            $this->logDeprecatedUsage($filename);
            
            // Add deprecated header for non-CDR files
            $this->response->setHeader('X-Deprecated', 'true');
            $this->response->setHeader('X-Deprecated-Message', 
                'Use /pbxcore/api/v2/sound-files/playback for non-CDR audio files');
            $this->response->setHeader('X-Recommended-Endpoint', 
                '/pbxcore/api/v2/sound-files/playback');
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
     * Applies HTTP headers to the response object
     * 
     * Properly sets headers including special handling for Content-Length
     * which requires a dedicated method in Phalcon.
     * 
     * @param array $headers Associative array of header names and values
     * 
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
    
    /**
     * Checks if the file path is a call recording
     * 
     * CDR recordings are typically stored in:
     * - /monitor/ - call recordings
     * - /voicemail/ - voicemail messages
     * - /voicemailarchive/ - archived voicemail
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
     * Logs deprecated usage of CDR endpoint for non-CDR files
     * 
     * This helps monitor migration progress and identify
     * components still using the wrong endpoint.
     * 
     * @param string $filename The file being accessed
     * @return void
     */
    private function logDeprecatedUsage(string $filename): void
    {
        // Extract file type from path
        $fileType = 'unknown';
        if (str_contains($filename, '/moh/')) {
            $fileType = 'MOH';
        } elseif (str_contains($filename, '/custom/')) {
            $fileType = 'custom_sound';
        } elseif (str_contains($filename, '/ivr/')) {
            $fileType = 'IVR';
        }
        
        // Log to system logger
        $message = sprintf(
            'DEPRECATED: CDR playback endpoint used for %s file: %s. Client: %s, User-Agent: %s',
            $fileType,
            basename($filename),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        );
        
        // Use syslog for monitoring
        SystemMessages::sysLogMsg(
            static::class,
            $message,
            LOG_WARNING
        );
    }
}
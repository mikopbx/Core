<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Filter\Filter;
use Phalcon\Mvc\Controller;
use Throwable;

/**
 * Class BaseController
 * @property \MikoPBX\PBXCoreREST\Http\Response $response
 * @property \MikoPBX\PBXCoreREST\Http\Request $request
 */
class BaseController extends Controller
{
    /**
     * Send a request to the backend worker.
     *
     * @param string $processor The name of the processor.
     * @param string $actionName The name of the action.
     * @param mixed|null $payload The payload data to send with the request.
     * @param string $moduleName The name of the module (only for 'modules' processor).
     * @param int $maxTimeout The maximum timeout for the request in seconds.
     * @param int $priority The priority of the request.
     *
     * @return void
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        mixed $payload = null,
        string $moduleName = '',
        int $maxTimeout = 30,
        int $priority = 0
    ): void {
        [$debug, $requestMessage] = $this->prepareRequestMessage($processor, $payload, $actionName, $moduleName);
        if ($debug) {
            $maxTimeout = 9999;
        } else {
            // Ensure minimum timeout for testing
            $maxTimeout = max($maxTimeout, 30);
        }

        try {
            // Initialize Redis connection
            $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);

            // Generate unique request ID
            $requestMessage['request_id'] = uniqid("req_{$actionName}_", true);

            // Push request to queue
            $pushResult = $redis->rpush(WorkerApiCommands::REDIS_API_QUEUE, json_encode($requestMessage));

            if ($pushResult <= 0) {
                throw new \RuntimeException("Failed to push request to Redis queue");
            }

            // Monitor queue backlog only for critical situations
            $queueLength = $redis->lLen(WorkerApiCommands::REDIS_API_QUEUE);
            if ($queueLength > 20) { // Only log if significant backlog
                SystemMessages::sysLogMsg(
                    static::class,
                    "Queue backlog detected: {$queueLength} requests pending",
                    LOG_WARNING
                );
            }

            if ($requestMessage['async']) {
                $this->response->setPayloadSuccess(['success' => true]);
                return;
            }

            // Get response key
            $responseKey = WorkerApiCommands::REDIS_API_RESPONSE_PREFIX . $requestMessage['request_id'];
            $response = null;
            $startTime = microtime(true);
            $retryCount = 0;
            $maxRetries = 5;
            
            // Calculate end time
            $endTime = $startTime + $maxTimeout;
            
            // Polling intervals strategy: fast polling at first, then gradually slow down
            $pollingIntervals = [
                // Fast polling for first second (10ms)
                ['duration' => 1, 'interval' => 10000],
                // Medium polling for next 4 seconds (50ms)
                ['duration' => 4, 'interval' => 50000],
                // Slower polling for next 10 seconds (100ms)
                ['duration' => 10, 'interval' => 100000],
                // Very slow polling for the rest (250ms)
                ['duration' => $maxTimeout, 'interval' => 250000]
            ];
            
            $currentPollingStage = 0;
            $stageStartTime = $startTime;
            $currentInterval = $pollingIntervals[0]['interval'];
            $attempts = 0;
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Waiting for response on key: %s",
                    $responseKey,
                ),
                LOG_DEBUG
            );
            while (microtime(true) < $endTime) {
                try {
                    // Check if we need to adjust polling interval
                    $elapsedTime = microtime(true) - $startTime;
                    $stageElapsedTime = microtime(true) - $stageStartTime;
                    
                    if ($currentPollingStage < count($pollingIntervals) - 1 && 
                        $stageElapsedTime >= $pollingIntervals[$currentPollingStage]['duration']) {
                        // Move to next polling stage
                        $currentPollingStage++;
                        $stageStartTime = microtime(true);
                        $currentInterval = $pollingIntervals[$currentPollingStage]['interval'];
                        
                        // Skip logging interval changes to reduce noise
                    }
                    
                    // Check for response
                    $attempts++;
                    $encodedResponse = $redis->get($responseKey);
                    
                    if ($encodedResponse !== false) {
                        $responseTime = microtime(true);
                        $responseDelay = $responseTime - $startTime;
                        
                        // Log only significantly slow responses (>3 seconds)
                        if ($responseDelay > 3.0) {
                            SystemMessages::sysLogMsg(
                                static::class,
                                "Slow response for action {$actionName}: {$responseDelay}s",
                                LOG_NOTICE
                            );
                        }
                        
                        $response = json_decode($encodedResponse, true);
                        break;
                    }
                    
                    // Short sleep before next check
                    usleep($currentInterval);
                    
                } catch (Throwable $exception) {
                    $retryCount++;

                    if ($retryCount > $maxRetries) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Max retry attempts exceeded for action {$actionName}: " . $exception->getMessage(),
                            LOG_ERR
                        );
                        throw $exception;
                    }

                    // Log retry attempt only for significant errors
                    if ($retryCount === 1) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Connection error for action {$actionName}, retrying: " . $exception->getMessage(),
                            LOG_WARNING
                        );
                    }

                    // Exponential backoff
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000);
                    usleep($sleepTime);

                    // Reconnect to Redis
                    $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
                }
            }

            // Clean up
            try {
                $redis->del($responseKey);
            } catch (Throwable $e) {
                // Ignore cleanup errors
            }

            // Calculate total time taken
            $totalTime = microtime(true) - $startTime;

            if ($response === null) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Request timeout for action {$actionName}: {$totalTime}s",
                    LOG_WARNING
                );
                $this->response->setPayloadError('Request timeout or worker not responding');
                return;
            }

            // Handle errors first
            if (array_key_exists(WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR, $response)) {
                // Extract HTTP code for error response (default 400)
                $httpCode = $response['httpCode'] ?? 400;
                $this->response->setPayloadError($response[WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR], $httpCode);
                return;
            }

            // Handle special responses (files, large data, streaming) with unified method
            if ($this->handleSpecialResponse($response, $redis)) {
                return;
            }

            // Handle normal response with proper HTTP status code
            // RESTful API: Use proper HTTP codes for different scenarios
            // - 200 OK for success
            // - 422 Unprocessable Entity for validation errors
            // - 409 Conflict for constraint violations
            if (isset($response['result']) && $response['result'] === false) {
                // Business error - use appropriate HTTP code (422 for validation, 409 for conflicts)
                $httpCode = $response['httpCode'] ?? 422;
                $this->response->setPayloadSuccess($response, $httpCode);
            } else {
                // Success response
                $httpCode = $response['httpCode'] ?? 200;
                $this->response->setPayloadSuccess($response, $httpCode);
            }

        } catch (Throwable $e) {
            // Log and handle error
            SystemMessages::sysLogMsg(
                static::class,
                "Backend worker error for {$processor}::{$actionName}: " . $e->getMessage(),
                LOG_ERR
            );

            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->response->setPayloadError($e->getMessage());
        }
    }


    /**
     * Sets the response with an error code
     *
     * @param int    $code
     * @param string $description
     */
    protected function sendError(int $code, string $description = ''): void
    {
        $this
            ->response
            ->setPayloadError($this->response->getHttpCodeDescription($code) . ' ' . $description)
            ->setStatusCode($code);
    }

    /**
     * Prepare a request message for sending to backend worker
     *
     * @param string $processor
     * @param mixed $payload
     * @param string $actionName
     * @param string $moduleName
     * @return array
     */
    public function prepareRequestMessage(
        string $processor,
        mixed $payload,
        string $actionName,
        string $moduleName
    ): array {
        // Old style modules, we can remove it after 2025
        if ($processor === 'modules') {
            $processor = PbxExtensionsProcessor::class;
        }

        $requestMessage = [
            'processor' => $processor,
            'data' => $payload,
            'action' => $actionName,
            'async' => false,
            'asyncChannelId' => ''
        ];

        if ($this->request->isAsyncRequest()) {
            $requestMessage['async'] = true;
            $requestMessage['asyncChannelId'] = $this->request->getAsyncRequestChannelId();
        }

        if ($processor === PbxExtensionsProcessor::class) {
            $requestMessage['module'] = $moduleName;
            $requestMessage['input'] = file_get_contents('php://input');
            $requestMessage['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'];
        }

        $requestMessage['debug'] = $this->request->isDebugRequest();
        
        // Add HTTP method to help backend distinguish between CREATE and UPDATE operations
        $requestMessage['httpMethod'] = $this->request->getMethod();

        // Pass authentication context for WebAuthn and other security features
        if ($this->request->isBearerTokenRequest()) {
            // Get origin for WebAuthn and other security features
            $origin = $this->request->getScheme() . '://' . $this->request->getHttpHost();

            // For Bearer tokens - include user context from JWT payload or API key
            $sessionContext = [
                'auth_type' => 'bearer_token',
                'token_id' => $this->request->getTokenInfo()['id'] ?? null,
                'origin' => $origin // For WebAuthn RP ID validation
            ];

            // If JWT token, add user info from payload
            $jwtPayload = $this->request->getJwtPayload();
            if ($jwtPayload) {
                $sessionContext['user_name'] = $jwtPayload['userId'] ?? null;
                $sessionContext['role'] = $jwtPayload['role'] ?? null;
                $sessionContext['session_id'] = $jwtPayload['jti'] ?? null; // JWT ID as session ID
            }

            $requestMessage['sessionContext'] = $sessionContext;
        }

        return array($requestMessage['debug'], $requestMessage);
    }

    /**
     * Recursively sanitizes input data based on the provided filter.
     *
     * @param array $data The data to be sanitized.
     * @param \Phalcon\Filter\FilterInterface $filter The filter object used for sanitization.
     *
     * @return array The sanitized data.
     */
    public static function sanitizeData(array $data, \Phalcon\Filter\FilterInterface $filter): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // Recursively sanitize array values
                $data[$key] = self::sanitizeData($value, $filter);
            } elseif (is_string($value)) {
                // Check if the string starts with 'http'
                if (stripos($value, 'http') === 0) {
                    // If the string starts with 'http', sanitize it as a URL
                    $data[$key] = $filter->sanitize($value, FILTER::FILTER_URL);
                } else {
                    // Use FILTER_STRING_LEGACY + trim (doesn't encode HTML entities)
                    $data[$key] = $filter->sanitize($value, [FILTER::FILTER_STRING_LEGACY, FILTER::FILTER_TRIM]);
                }
            } elseif (is_numeric($value)) {
                // Sanitize numeric values as integers
                $data[$key] = $filter->sanitize($value, FILTER::FILTER_INT);
            }
        }

        return $data;
    }

    /**
     * Handle special responses from backend worker
     *
     * Unified method for handling all types of special responses:
     * - File-based responses (large data stored in files)
     * - Redis-based large responses (compressed data in Redis)
     * - File streaming (fpassthru for audio/downloads)
     *
     * @param array $response Response from backend worker
     * @param mixed $redis Redis client instance
     * @return bool True if special response was handled, false otherwise
     */
    private function handleSpecialResponse(array $response, $redis): bool
    {
        // Type 1: File-based response (large serialized data)
        if (isset($response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE])) {
            return $this->handleFileBasedResponse($response);
        }

        // Type 2: Redis-based large response (compressed data)
        if (isset($response['large_response_redis'])) {
            return $this->handleLargeRedisResponse($response, $redis);
        }

        // Type 3: File streaming (audio, downloads)
        if (isset($response['data']['fpassthru'])) {
            return $this->handleFileStreaming($response['data']['fpassthru']);
        }

        return false;
    }

    /**
     * Handle file-based response (large serialized data stored in temp files)
     *
     * @param array $response Response data
     * @return bool Always true (response handled)
     */
    private function handleFileBasedResponse(array $response): bool
    {
        $filename = $response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE];

        if (!file_exists($filename)) {
            $this->response->setPayloadError('Response file not found');
            return true;
        }

        $fileContent = file_get_contents($filename);
        if ($fileContent === false) {
            $this->response->setPayloadError('Failed to read response file');
            return true;
        }

        // Handle compression if needed
        if (isset($response['compressed']) && $response['compressed'] === true) {
            $fileContent = gzdecode($fileContent);
            if ($fileContent === false) {
                $this->response->setPayloadError('Failed to decompress response data');
                return true;
            }
        }

        // Deserialize and send response
        $data = unserialize($fileContent);
        unlink($filename); // Clean up temp file
        $this->response->setPayloadSuccess($data);

        return true;
    }

    /**
     * Handle large Redis response (compressed data in Redis)
     *
     * @param array $response Response data
     * @param mixed $redis Redis client
     * @return bool Always true (response handled)
     */
    private function handleLargeRedisResponse(array $response, $redis): bool
    {
        $redisKey = $response['large_response_redis'];
        $compressedData = $redis->get($redisKey);

        if ($compressedData === false) {
            $this->response->setPayloadError('Large response data not found in Redis');
            return true;
        }

        // Clean up Redis key
        $redis->del($redisKey);

        // Decompress and deserialize
        $data = gzdecode($compressedData);
        if ($data === false) {
            $this->response->setPayloadError('Failed to decompress response data');
            return true;
        }

        $response = unserialize($data);
        $this->response->setPayloadSuccess($response);

        return true;
    }

    /**
     * Handle file streaming (audio, downloads with Range support)
     *
     * @param array $fileData File data from backend
     * @return bool Always true (response handled)
     */
    private function handleFileStreaming(array $fileData): bool
    {
        $filename = $fileData['filename'] ?? '';

        if (empty($filename) || !file_exists($filename)) {
            $this->response->setStatusCode(404, 'File Not Found');
            $this->response->send();
            return true;
        }

        // Get file information
        $fileSize = filesize($filename);
        $contentType = $fileData['content_type'] ?? 'application/octet-stream';
        $downloadName = $fileData['download_name'] ?? null;
        $needDelete = $fileData['need_delete'] ?? false;
        $additionalHeaders = $fileData['additional_headers'] ?? [];

        // Add additional headers (e.g., X-Audio-Duration)
        foreach ($additionalHeaders as $headerName => $headerValue) {
            $this->response->setHeader($headerName, $headerValue);
        }

        // Check for Range request (for audio/video seeking)
        $rangeHeader = $_SERVER['HTTP_RANGE'] ?? null;

        if ($rangeHeader !== null && $this->isStreamableContent($contentType)) {
            $this->handleRangeRequest($filename, $fileSize, $contentType, $rangeHeader, $downloadName);
        } else {
            $this->handleFullFileRequest($filename, $fileSize, $contentType, $downloadName);
        }

        // Clean up file if requested
        if ($needDelete && file_exists($filename)) {
            unlink($filename);
        }

        return true;
    }

    /**
     * Check if content type supports range requests (streaming)
     *
     * @param string $contentType MIME type
     * @return bool
     */
    private function isStreamableContent(string $contentType): bool
    {
        return str_starts_with($contentType, 'audio/') ||
               str_starts_with($contentType, 'video/');
    }

    /**
     * Handle HTTP Range request for partial content
     *
     * @param string $filename File path
     * @param int $fileSize Total file size
     * @param string $contentType MIME type
     * @param string $rangeHeader Range header value
     * @param string|null $downloadName Optional download filename
     */
    private function handleRangeRequest(
        string $filename,
        int $fileSize,
        string $contentType,
        string $rangeHeader,
        ?string $downloadName = null
    ): void {
        // Parse Range header (e.g., "bytes=0-1023")
        if (!preg_match('/bytes=(\d+)-(\d*)/', $rangeHeader, $matches)) {
            $this->response->setStatusCode(416, 'Range Not Satisfiable');
            $this->response->send();
            return;
        }

        $start = (int)$matches[1];
        $end = !empty($matches[2]) ? (int)$matches[2] : $fileSize - 1;

        // Validate range
        if ($start >= $fileSize || $end >= $fileSize || $start > $end) {
            $this->response->setStatusCode(416, 'Range Not Satisfiable');
            $this->response->setHeader('Content-Range', "bytes */$fileSize");
            $this->response->send();
            return;
        }

        $contentLength = $end - $start + 1;

        // Set partial content headers
        $this->response->setStatusCode(206, 'Partial Content');
        $this->response->setHeader('Content-Type', $contentType);
        $this->response->setHeader('Content-Range', "bytes $start-$end/$fileSize");
        $this->response->setContentLength($contentLength);
        $this->response->setHeader('Accept-Ranges', 'bytes');
        $this->response->setHeader('Content-Transfer-Encoding', 'binary');

        // Set download headers if needed
        if ($downloadName !== null) {
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $downloadName . '"');
        } else {
            $this->response->setHeader('Content-Disposition', 'inline');
        }

        // Send headers
        $this->response->sendHeaders();

        // Stream partial content
        $fp = fopen($filename, 'rb');
        if ($fp !== false) {
            fseek($fp, $start);
            $remaining = $contentLength;
            $bufferSize = 8192;

            while ($remaining > 0 && !feof($fp)) {
                $bytesToRead = min($bufferSize, $remaining);
                $buffer = fread($fp, $bytesToRead);
                if ($buffer === false) break;

                echo $buffer;
                $remaining -= strlen($buffer);

                // Flush output to client
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();
            }
            fclose($fp);
        }
    }

    /**
     * Handle full file request
     *
     * @param string $filename File path
     * @param int $fileSize File size
     * @param string $contentType MIME type
     * @param string|null $downloadName Optional download filename
     */
    private function handleFullFileRequest(
        string $filename,
        int $fileSize,
        string $contentType,
        ?string $downloadName = null
    ): void {
        // Set response headers
        $this->response->setHeader('Content-Type', $contentType);
        $this->response->setContentLength($fileSize);
        $this->response->setHeader('Content-Transfer-Encoding', 'binary');
        $this->response->setHeader('Accept-Ranges', 'bytes');

        // Set download headers if needed
        if ($downloadName !== null) {
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $downloadName . '"');
        } else {
            $this->response->setHeader('Content-Disposition', 'inline');
        }

        // Send headers and stream file
        $this->response->sendHeaders();

        $fp = fopen($filename, 'rb');
        if ($fp !== false) {
            fpassthru($fp);
            fclose($fp);
        }
    }
}

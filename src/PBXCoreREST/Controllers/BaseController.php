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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Filter\Filter;
use Phalcon\Mvc\Controller;
use RedisException;
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
        }

        try {
         
         

            // Generate unique request ID
            $requestMessage['request_id'] = uniqid('req_', true);

            // Push request to queue
            $this->redis->rpush(WorkerApiCommands::REDIS_API_QUEUE, json_encode($requestMessage));

            if ($requestMessage['async']) {
                $this->response->setPayloadSuccess(['success' => true]);
                return;
            }

            // Subscribe to response channel
            $responseKey = WorkerApiCommands::REDIS_API_RESPONSE_PREFIX . $requestMessage['request_id'];
            $response = null;
            $startTime = time();
            $retryCount = 0;
            $maxRetries = 5;
            
            // Wait for response with timeout and retry logic
            while (time() - $startTime < $maxTimeout) {
                try {
                    // Check if response is ready
                    $encodedResponse = $this->redis->get($responseKey);
                    if ($encodedResponse !== false) {
                        $response = json_decode($encodedResponse, true);
                        break;
                    }

                    // Subscribe to notification channel with timeout
                    $gotResponse = false;
                    $subscribeTimeout = 5; // 5 second timeout for subscribe
                    
                    try {
                        // Set read timeout for subscription
                        $this->redis->setOption(3, $subscribeTimeout); // 3 is Redis::OPT_READ_TIMEOUT
                        
                        $this->redis->subscribe([$responseKey], function($redis, $channel, $message) use (&$gotResponse) {
                            if ($message === 'ready') {
                                $gotResponse = true;
                                $redis->unsubscribe([$channel]);
                            }
                        });
                    } catch (RedisException $subscribeException) {
                        // Handle Redis-specific subscription errors
                        if (strpos($subscribeException->getMessage(), 'read error') !== false) {
                            // This is a timeout or connection loss during subscribe, which is expected
                            // Just log and continue with retry logic in outer catch blocks
                            SystemMessages::sysLogMsg(
                                static::class,
                                "Redis subscribe timeout (expected behavior): " . $subscribeException->getMessage(),
                                LOG_DEBUG
                            );
                        } else {
                            // For other Redis-specific errors, rethrow to be caught by the outer catch block
                            throw $subscribeException;
                        }
                    } catch (Throwable $subscribeException) {
                        // For other types of errors during subscribe, rethrow to be caught by the outer catch block
                        throw $subscribeException;
                    }

                    if ($gotResponse) {
                        $encodedResponse = $this->redis->get($responseKey);
                        if ($encodedResponse !== false) {
                            $response = json_decode($encodedResponse, true);
                            break;
                        }
                    }

                    // Small sleep to prevent CPU overload
                    usleep(100000); // 100ms
                } catch (RedisException $redisException) {
                    // Specific handling for Redis exceptions
                    $retryCount++;
                    
                    if ($retryCount > $maxRetries) {
                        // Log last failed attempt before throwing
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Max Redis retry attempts exceeded: %s (action: %s)",
                                $redisException->getMessage(),
                                $actionName
                            ),
                            LOG_ERR
                        );
                        throw $redisException; // Max retries exceeded
                    }
                    
                    // Log Redis-specific retry attempt using both handlers for better visibility
                    $errorMessage = sprintf(
                        "Redis connection error during worker request, retrying (%d/%d): %s (action: %s)",
                        $retryCount, 
                        $maxRetries, 
                        $redisException->getMessage(),
                        $actionName
                    );
                    
                    // Log to system log
                    SystemMessages::sysLogMsg(static::class, $errorMessage, LOG_WARNING);
                    
                    // Also log with error handler for potential capture in Sentry
                    CriticalErrorsHandler::handleExceptionWithSyslog(
                        new \Exception($errorMessage)
                    );
                    
                    // Exponential backoff with jitter
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                    usleep($sleepTime);
                } catch (Throwable $otherException) {
                    // Handle Redis connection errors with retry
                    $retryCount++;
                    
                    if ($retryCount > $maxRetries) {
                        // Log last failed attempt before throwing
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Max retry attempts exceeded for general exception: %s (action: %s)",
                                $otherException->getMessage(),
                                $actionName
                            ),
                            LOG_ERR
                        );
                        throw $otherException; // Max retries exceeded
                    }
                    
                    // Log general exception retry attempt
                    $errorMessage = sprintf(
                        "Error during worker request, retrying (%d/%d): %s (action: %s)",
                        $retryCount, 
                        $maxRetries, 
                        $otherException->getMessage(),
                        $actionName
                    );
                    
                    // Log to system log
                    SystemMessages::sysLogMsg(static::class, $errorMessage, LOG_WARNING);
                    
                    // Also log with error handler for potential capture in Sentry
                    CriticalErrorsHandler::handleExceptionWithSyslog(
                        new \Exception($errorMessage)
                    );
                    
                    // Exponential backoff with jitter
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                    usleep($sleepTime);
        
                }
            }

            // Clean up
            try {
                $this->redis->del($responseKey);
            } catch (Throwable $e) {
                // Ignore cleanup errors
            }

            if ($response === null) {
                $this->response->setPayloadError('Request timeout or worker not responding');
                return;
            }

            // Handle file-based response
            if (isset($response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE])) {
                $filename = $response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE];
                if (file_exists($filename)) {
                    $response = unserialize(file_get_contents($filename));
                    unlink($filename);
                    $this->response->setPayloadSuccess($response);
                } else {
                    $this->response->setPayloadError('Response file not found');
                }
                return;
            }

            if (array_key_exists(WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR, $response)) {
                $this->response->setPayloadError($response[WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR]);
            } else {
                $this->response->setPayloadSuccess($response);
            }

        } catch (Throwable $e) {
            // Log the error with detailed information
            $errorMessage = sprintf(
                "Error in sendRequestToBackendWorker: %s (processor: %s, action: %s)", 
                $e->getMessage(),
                $processor,
                $actionName
            );
            
            // Log to system log first for visibility in server logs
            SystemMessages::sysLogMsg(static::class, $errorMessage, LOG_ERR);
            
            // Then use critical error handler for potential Sentry capture
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            
            // Return error to client
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
        }

        $requestMessage['debug'] = $this->request->isDebugRequest();

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
                    // Sanitize regular strings (trim and remove illegal characters)
                    $data[$key] = $filter->sanitize($value, [FILTER::FILTER_STRING, FILTER::FILTER_TRIM]);
                }
            } elseif (is_numeric($value)) {
                // Sanitize numeric values as integers
                $data[$key] = $filter->sanitize($value, FILTER::FILTER_INT);
            }
        }

        return $data;
    }
}

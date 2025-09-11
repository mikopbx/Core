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

use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\SessionProvider;
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
     * Indicates whether this controller requires CSRF protection
     * Controllers can override this constant to opt-in to CSRF protection
     */
    public const bool REQUIRES_CSRF_PROTECTION = false;
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
            
            // Проверяем, что задача действительно добавлена в очередь
            if ($pushResult <= 0) {
                throw new \RuntimeException("Failed to push request to Redis queue");
            }
            
            // Проверяем текущий размер очереди и логируем
            $queueLength = $redis->lLen(WorkerApiCommands::REDIS_API_QUEUE);
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Request added to queue: action=%s, id=%s, queue_position=%d/%d",
                    $actionName,
                    $requestMessage['request_id'],
                    $pushResult,
                    $queueLength
                ),
                LOG_DEBUG
            );
            
            // Подсчитываем, сколько активных воркеров доступны для обработки
            $activeWorkers = $redis->keys('worker_api_commands:*');
            $runningWorkers = count($activeWorkers);
            
            // Если в очереди много запросов, но мало воркеров, логируем предупреждение
            if ($queueLength > $runningWorkers * 2) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "WARNING: Queue backlog detected - %d requests in queue with only %d workers",
                        $queueLength,
                        $runningWorkers
                    ),
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
                        
                        // Response received - only log if it took longer than expected (over 1 second)
                        if ($responseDelay > 1.0) {
                            SystemMessages::sysLogMsg(
                                static::class,
                                sprintf(
                                    "Delayed response for action '%s' received after %.3fs (attempts: %d)",
                                    $actionName,
                                    $responseDelay,
                                    $attempts
                                ),
                                LOG_NOTICE
                            );
                        }
                        
                        $response = json_decode($encodedResponse, true);
                        break;
                    }
                    
                    // Short sleep before next check
                    usleep($currentInterval);
                    
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
                    
                    // Log Redis-specific retry attempt
                    $errorMessage = sprintf(
                        "Redis connection error during worker request, retrying (%d/%d): %s (action: %s)",
                        $retryCount, 
                        $maxRetries, 
                        $redisException->getMessage(),
                        $actionName
                    );
                    
                    // Log to system log
                    SystemMessages::sysLogMsg(static::class, $errorMessage, LOG_WARNING);
                    
                    // Also log with error handler for potential Sentry capture
                    CriticalErrorsHandler::handleExceptionWithSyslog(
                        new \Exception($errorMessage)
                    );
                    
                    // Exponential backoff with jitter
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                    usleep($sleepTime);
                    
                    // Reconnect
                    $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
                } catch (Throwable $otherException) {
                    // Handle other errors with retry
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
                    
                    // Also log with error handler for potential Sentry capture
                    CriticalErrorsHandler::handleExceptionWithSyslog(
                        new \Exception($errorMessage)
                    );
                    
                    // Exponential backoff with jitter
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                    usleep($sleepTime);
                    
                    // Reconnect
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
                    sprintf(
                        "Request timeout after %.3fs: No response received for action %s",
                        $totalTime,
                        $actionName
                    ),
                    LOG_WARNING
                );
                $this->response->setPayloadError('Request timeout or worker not responding');
                return;
            }

           // Handle file-based response
           if (isset($response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE])) {
            $filename = $response[WorkerApiCommands::REDIS_RESPONSE_IN_FILE];
            if (file_exists($filename)) {
                $fileContent = file_get_contents($filename);
                if ($fileContent !== false) {
                    // Check if response is compressed
                    if (isset($response['compressed']) && $response['compressed'] === true) {
                        $fileContent = gzdecode($fileContent);
                    }
                    
                    $response = unserialize($fileContent);
                    unlink($filename);
                    $this->response->setPayloadSuccess($response);
                } else {
                    $this->response->setPayloadError('Failed to read response file');
                }
            } else {
                $this->response->setPayloadError('Response file not found');
            }
            return;
        }
        
        // Handle compressed Redis-based large response
        if (isset($response['large_response_redis'])) {
            $redisKey = $response['large_response_redis'];
            $compressedData = $redis->get($redisKey);
            
            if ($compressedData !== false) {
                // Clear the key since we're consuming the data
                $redis->del($redisKey);
                
                // Decompress and unserialize the data
                $data = gzdecode($compressedData);
                if ($data !== false) {
                    $response = unserialize($data);
                    $this->response->setPayloadSuccess($response);
                } else {
                    $this->response->setPayloadError('Failed to decompress response data');
                }
            } else {
                $this->response->setPayloadError('Large response data not found in Redis');
            }
            return;
        }


            if (array_key_exists(WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR, $response)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Setting error response: job_id=%s, error=%s",
                        $requestMessage['request_id'] ?? 'unknown',
                        $response[WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR]
                    ),
                    LOG_DEBUG
                );
                $this->response->setPayloadError($response[WorkerApiCommands::REDIS_JOB_PROCESSING_ERROR]);
            } else {
                // Only log response time if it took longer than expected
                if ($totalTime > 1.0) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf(
                            "Slow response for action '%s': %.3fs with %d attempts",
                            $actionName,
                            $totalTime,
                            $attempts
                        ),
                        LOG_NOTICE
                    );
                }
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
            $requestMessage['input'] = file_get_contents('php://input');
            $requestMessage['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'];
        }

        $requestMessage['debug'] = $this->request->isDebugRequest();
        
        // Add HTTP method to help backend distinguish between CREATE and UPDATE operations
        $requestMessage['httpMethod'] = $this->request->getMethod();
        
        // Pass session context for ACL modules (like ModuleUsersUI)
        // Only for session-based requests, not for API keys
        if ($this->request->isAuthorizedSessionRequest()) {
            $session = $this->di->get(SessionProvider::SERVICE_NAME);
            $sessionData = $session->get(SessionController::SESSION_ID);
            
            if ($sessionData) {
                // Pass only necessary session data for ACL
                $requestMessage['sessionContext'] = [
                    'role' => $sessionData[SessionController::ROLE] ?? null,
                    'user_id' => $sessionData['user_id'] ?? null,
                    'auth_type' => 'session'
                ];
            }
        } elseif ($this->request->isBearerTokenRequest()) {
            // For Bearer tokens - just mark auth type, no user context
            $requestMessage['sessionContext'] = [
                'auth_type' => 'bearer_token',
                'token_id' => $this->request->getTokenInfo()['id'] ?? null
            ];
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
}

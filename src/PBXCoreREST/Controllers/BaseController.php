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
        }

        try {
            // Initialize Redis connection
            if (!$this->di->has(RedisClientProvider::SERVICE_NAME)) {
                $this->di->register(new RedisClientProvider());
            }
            $apiRedis = RedisClientProvider::getApiRequestsConnection($this->di);
            $pubSubRedis = RedisClientProvider::getPubSubConnection($this->di);

            // Generate unique request ID
            $requestMessage['request_id'] = uniqid('req_', true);

            // Push request to queue
            $apiRedis->rpush(WorkerApiCommands::REDIS_API_QUEUE, json_encode($requestMessage));

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
                    $encodedResponse = $apiRedis->get($responseKey);
                    if ($encodedResponse !== false) {
                        $response = json_decode($encodedResponse, true);
                        break;
                    }

                    // Subscribe to notification channel with timeout
                    $gotResponse = false;
                    $subscribeTimeout = 5; // 5 second timeout for subscribe
                    
                    try {
                        // Set read timeout for subscription
                        $pubSubRedis->setOption(3, $subscribeTimeout); // 3 is Redis::OPT_READ_TIMEOUT
                        
                        $pubSubRedis->subscribe([$responseKey], function($redis, $channel, $message) use (&$gotResponse) {
                            if ($message === 'ready') {
                                $gotResponse = true;
                                $redis->unsubscribe([$channel]);
                            }
                        });
                    } catch (Throwable $subscribeException) {
                        // If connection lost during subscribe, reconnect and continue
                        if (strpos($subscribeException->getMessage(), 'read error') !== false) {
                            $retryCount++;
                            
                            if ($retryCount > $maxRetries) {
                                throw $subscribeException; // Max retries exceeded
                            }
                            
                            // Exponential backoff with jitter
                            $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                            usleep($sleepTime);
                            
                            // Reconnect
                            $pubSubRedis = RedisClientProvider::getPubSubConnection($this->di);
                            $apiRedis = RedisClientProvider::getApiRequestsConnection($this->di);
                            
                            continue;
                        }
                        throw $subscribeException; // Other Redis exceptions
                    }

                    if ($gotResponse) {
                        $encodedResponse = $apiRedis->get($responseKey);
                        if ($encodedResponse !== false) {
                            $response = json_decode($encodedResponse, true);
                            break;
                        }
                    }

                    // Small sleep to prevent CPU overload
                    usleep(100000); // 100ms
                } catch (Throwable $redisException) {
                    // Handle Redis connection errors with retry
                    $retryCount++;
                    
                    if ($retryCount > $maxRetries) {
                        throw $redisException; // Max retries exceeded
                    }
                    
                    // Log retry attempt
                    CriticalErrorsHandler::handleExceptionWithSyslog(
                        new \Exception("Redis connection error during worker request, retrying ({$retryCount}/{$maxRetries}): " . $redisException->getMessage())
                    );
                    
                    // Exponential backoff with jitter
                    $sleepTime = min(pow(2, $retryCount) * 100000, 2000000) + mt_rand(0, 100000);
                    usleep($sleepTime);
                    
                    // Reconnect
                    $pubSubRedis = RedisClientProvider::getPubSubConnection($this->di);
                    $apiRedis = RedisClientProvider::getApiRequestsConnection($this->di);
                }
            }

            // Clean up
            try {
                $apiRedis->del($responseKey);
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

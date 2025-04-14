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
        
        // Увеличиваем таймаут для известных долгих операций
        if (
            // Действия связанные с модулями, особенно получение списка доступных
            ($processor === PbxExtensionsProcessor::class || $processor === 'modules') &&
            in_array($actionName, ['getAvailableModules', 'installModule', 'updateModule', 'backupModule'], true)
        ) {
            $maxTimeout = max($maxTimeout, 300); // Увеличим до 5 минут для операций с модулями
        }

        try {
            $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
         

            // Generate unique request ID
            $requestMessage['request_id'] = uniqid('req_', true);
            
            // Add client-side timestamps for performance tracking
            $requestMessage['_client_timestamps'] = [
                'request_sent' => microtime(true)
            ];

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
            
            // Add a small delay before first check to allow time for processing
            usleep(50000); // 50ms delay
            
            // Important: Check if response is already available before setting up subscription
            $encodedResponse = $this->redis->get($responseKey);
            if ($encodedResponse !== false) {
                $response = json_decode($encodedResponse, true);
                
                // Log that we found the response immediately
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Response found immediately after request: %s (request_id: %s)",
                        $actionName,
                        $requestMessage['request_id']
                    ),
                    LOG_NOTICE
                );
            }
            
            // Прогрессивный таймаут - начинаем с частых проверок, затем увеличиваем интервалы
            $progressiveTimeouts = [
                // [время после запроса в секундах, интервал проверки в микросекундах]
                [0, 10000],      // первые 5 секунд - проверка каждые 10мс
                [5, 100000],     // от 5 до 15 секунд - каждые 100мс
                [15, 500000],    // от 15 до 60 секунд - каждые 500мс
                [60, 1000000],   // от 1 до 5 минут - каждую секунду
            ];
            
            $lastProgressiveCheck = microtime(true);
            $currentProgressiveStage = 0;
            
            // Wait for response with progressive timeout and retry logic
            while ($response === null && time() - $startTime < $maxTimeout) {
                try {
                    // Определяем текущий интервал проверки на основе времени с начала запроса
                    $elapsedSeconds = time() - $startTime;
                    
                    // Обновляем текущую стадию при необходимости
                    while (
                        $currentProgressiveStage < count($progressiveTimeouts) - 1 && 
                        $elapsedSeconds >= $progressiveTimeouts[$currentProgressiveStage + 1][0]
                    ) {
                        $currentProgressiveStage++;
                    }
                    
                    // Получаем интервал проверки для текущей стадии
                    $checkInterval = $progressiveTimeouts[$currentProgressiveStage][1];
                    
                    // Проверяем, прошло ли достаточно времени с последней проверки
                    $now = microtime(true);
                    if ($now - $lastProgressiveCheck < $checkInterval / 1000000) {
                        // Если еще рано для проверки, делаем короткую паузу
                        usleep(5000); // 5мс
                        continue;
                    }
                    
                    // Обновляем время последней проверки
                    $lastProgressiveCheck = $now;
                    
                    // Check if response is ready
                    $encodedResponse = $this->redis->get($responseKey);
                    if ($encodedResponse !== false) {
                        $response = json_decode($encodedResponse, true);
                        break;
                    }
                    
                    // Вместо длительной блокирующей подписки используем короткую проверку на наличие сообщений
                    try {
                        // Проверяем, есть ли уже сообщения в канале (без блокировки)
                        // Адаптивный таймаут для Redis операций в зависимости от текущей стадии
                        $redisOpTimeout = min(1.0, $checkInterval / 500000); // от 0.02 до 1.0 секунды
                        $this->redis->setOption(3, $redisOpTimeout);
                        
                        // Используем subscribe с коротким таймаутом
                        $gotResponse = false;
                        $this->redis->subscribe([$responseKey], function($redis, $channel, $message) use (&$gotResponse) {
                            if ($message === 'ready') {
                                $gotResponse = true;
                                $redis->unsubscribe([$channel]);
                            }
                        });
                        
                        // Если получили сообщение, пробуем получить ответ
                        if ($gotResponse) {
                            $encodedResponse = $this->redis->get($responseKey);
                            if ($encodedResponse !== false) {
                                $response = json_decode($encodedResponse, true);
                                break;
                            }
                        }
                    } catch (RedisException $e) {
                        // Игнорируем таймаут подписки - это ожидаемое поведение
                    }
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

            // Add client-side receive timestamp
            $clientTimestamps = [
                'response_received' => microtime(true),
                'total_time' => microtime(true) - $requestMessage['_client_timestamps']['request_sent'],
                'timeout_info' => [
                    'max_timeout' => $maxTimeout,
                    'elapsed_time' => time() - $startTime,
                    'progressive_stage' => $currentProgressiveStage,
                ]
            ];
            
            // Последняя попытка проверить наличие ответа перед объявлением таймаута
            if ($response === null) {
                // Прогрессивные финальные проверки - с разными интервалами в зависимости от времени запроса
                $finalCheckIntervals = [100000, 300000, 500000]; // 100мс, 300мс, 500мс
                
                // Если запрос был долгим, увеличиваем интервалы проверки
                if (time() - $startTime > 60) {
                    $finalCheckIntervals = [500000, 1000000, 2000000]; // 500мс, 1сек, 2сек
                }
                
                for ($finalAttempt = 0; $finalAttempt < count($finalCheckIntervals); $finalAttempt++) {
                    // Сразу проверяем ответ снова
                    $encodedResponse = $this->redis->get($responseKey);
                    if ($encodedResponse !== false) {
                        $response = json_decode($encodedResponse, true);
                        // Логируем, что нашли ответ после выхода из основного цикла
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Response found after main timeout loop (attempt %d): %s (request_id: %s, elapsed: %ds)",
                                $finalAttempt + 1,
                                $actionName,
                                $requestMessage['request_id'],
                                time() - $startTime
                            ),
                            LOG_NOTICE
                        );
                        break;
                    }
                    
                    // Если это не последняя проверка, делаем паузу перед следующей
                    if ($finalAttempt < count($finalCheckIntervals) - 1) {
                        usleep($finalCheckIntervals[$finalAttempt]);
                    }
                }
            }
            
            // Try to get additional performance metrics
            try {
                $metricsKey = "api:metrics:{$requestMessage['request_id']}";
                $metricsData = $this->redis->get($metricsKey);
                if ($metricsData !== false) {
                    $redisMetrics = json_decode($metricsData, true);
                    $clientTimestamps['redis_metrics'] = $redisMetrics;
                    
                    // Calculate round-trip time (client → queue → worker → redis → client)
                    if (isset($redisMetrics['start'])) {
                        $clientTimestamps['queue_time'] = $redisMetrics['start'] - $requestMessage['_client_timestamps']['request_sent'];
                    }
                    
                    // Clean up metrics key
                    $this->redis->del($metricsKey);
                }
            } catch (Throwable $e) {
                // Ignore metrics errors
            }

            // Clean up
            try {
                $this->redis->del($responseKey);
            } catch (Throwable $e) {
                // Ignore cleanup errors
            }

            if ($response === null) {
                // Логируем детали о таймауте для отладки
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Request timeout detected: %s, processor: %s, request_id: %s, timeout: %ds, time spent: %ds",
                        $actionName,
                        $processor,
                        $requestMessage['request_id'],
                        $maxTimeout,
                        time() - $startTime
                    ),
                    LOG_WARNING
                );
                
                // Формируем более информативное сообщение для пользователя
                $timeoutMessage = sprintf(
                    'Превышено время ожидания ответа (запрос выполнялся %d сек из допустимых %d сек). ' . 
                    'Возможно, запрос слишком долгий или сервис не отвечает. ' . 
                    'ID запроса: %s',
                    time() - $startTime,
                    $maxTimeout,
                    $requestMessage['request_id']
                );
                
                $this->response->setPayloadError($timeoutMessage);
                return;
            }

            // Add client timing data to response
            if (isset($response['_performance'])) {
                $response['_performance']['client_side'] = $clientTimestamps;
                
                // Добавляем информацию о прогрессивных таймаутах
                $response['_performance']['timeout_strategy'] = [
                    'max_timeout' => $maxTimeout,
                    'time_spent' => time() - $startTime,
                    'progressive_stage_reached' => $currentProgressiveStage,
                    'progressive_stages' => $progressiveTimeouts
                ];
                
                // Log slow requests (over 1 second total)
                if ($clientTimestamps['total_time'] > 1.0) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf(
                            "Slow API request: %s - total: %.3fs, queue: %.3fs, processing: %.3fs, stage: %d",
                            $actionName,
                            $clientTimestamps['total_time'],
                            $clientTimestamps['queue_time'] ?? 0,
                            $response['_performance']['total_processing_time'] ?? 0,
                            $currentProgressiveStage
                        ),
                        LOG_NOTICE
                    );
                }
            } else {
                $response['_performance'] = [
                    'client_side' => $clientTimestamps,
                    'timeout_strategy' => [
                        'max_timeout' => $maxTimeout,
                        'time_spent' => time() - $startTime,
                        'progressive_stage_reached' => $currentProgressiveStage,
                    ]
                ];
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
                $compressedData = $this->redis->get($redisKey);
                
                if ($compressedData !== false) {
                    // Clear the key since we're consuming the data
                    $this->redis->del($redisKey);
                    
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

<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\{Processes, SystemMessages};
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use RuntimeException;
use Throwable;

require_once 'Globals.php';

/**
 * Class WorkerApiCommands
 *
 * Handles API command requests using Redis for queuing and process management.
 * Provides functionality for job retries, error handling, and cleanup of failed jobs.
 *
 * Features:
 * - Request processing in forked subprocesses
 * - Job retry mechanism with maximum attempts
 * - Response handling with large payload support
 * - Process monitoring and cleanup
 * - Request validation and error handling
 *
 * Request format:
 * {
 *   "request_id": "unique_id",
 *   "processor": "ProcessorClassName",
 *   "action": "methodName",
 *   "async": false,
 *   "data": {...}
 * }
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerApiCommands extends WorkerRedisBase
{

    /**
     * Redis queue and channel names
     */
    public const string REDIS_API_QUEUE = 'api:requests';
    public const string REDIS_API_RESPONSE_PREFIX = 'api:response:';
    public const string REDIS_RESPONSE_IN_FILE = 'response-in-file';
    public const string REDIS_JOB_PROCESSING_ERROR = 'job_processing_error';

    /**
     * Failed jobs configuration
     */
    private const string REDIS_FAILED_JOBS_QUEUE = 'api:failed:jobs';
    private const string REDIS_JOB_ATTEMPTS_PREFIX = 'api:job:attempts:';
    private const string REDIS_JOB_ERRORS_PREFIX = 'api:job:errors:';
    private const string REDIS_FAILED_JOBS_DATA = 'api:failed:jobs:data';
    private const int MAX_JOB_ATTEMPTS = 3;
    private const int FAILED_JOB_TTL = 86400; // 24 hours


    /**
     * System configuration
     */
    private const int REDIS_RESPONSE_TTL = 3600; // 1 hour
    private const int MAX_RESPONSE_SIZE = 1048576; // 1MB
    private const int PROCESS_CHECK_INTERVAL = 100000; // 100ms


    /**
     * Default to 3 concurrent worker processes instead of 1
     */
    public int $maxProc = 3;

    /**
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds
    }

    /**
     * Start worker and process requests
     *
     * This is the main entry point for the worker. It initializes Redis connections
     * and enters the main processing loop.
     *
     * @param array $argv Command line arguments
     * @throws Throwable If fatal error occurs
     */
    public function start(array $argv): void
    {
        try {
            // Check for pending module post-installations immediately after worker starts
            ModuleInstallationBase::processModulePostInstallations();     

            // Log worker instance information
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Worker instance started: Instance ID=%d, PID=%d, Redis queue=%s",
                    $this->instanceId,
                    getmypid(),
                    self::REDIS_API_QUEUE
                ),
                LOG_NOTICE
            );

            // Process requests until shutdown
            while (!$this->isShuttingDown && $this->needRestart === false) {
                try {
                    // Process signals
                    pcntl_signal_dispatch();
                    
                    // Send periodic heartbeat
                    $this->checkHeartbeat();
                    
                    // Connect to Redis
                    $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
                    
                    // Периодически проверяем состояние очереди (каждую минуту)
                    static $lastQueueCheckTime = 0;
                    if (time() - $lastQueueCheckTime > 60) {
                        $this->checkQueueState();
                        $lastQueueCheckTime = time();
                    }
                    
                    // Get job from queue with 5 second timeout
                    $result = $this->redis->blpop(
                        [self::REDIS_API_QUEUE, self::REDIS_FAILED_JOBS_QUEUE], 
                        5
                    );
                    
                    // No job available, check signals and continue
                    if (!is_array($result) || count($result) !== 2) {
                        continue;
                    }
                    
                    // Process job data
                    [$queue, $requestData] = $result;
                    
                    // Verify job data
                    if (!is_string($requestData)) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf("Invalid job data type: %s", gettype($requestData)),
                            LOG_WARNING
                        );
                        continue;
                    }
                    
                    // Parse JSON data
                    $request = json_decode($requestData, true);
                    if ($request === null && json_last_error() !== JSON_ERROR_NONE) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf("Invalid JSON in job data: %s", json_last_error_msg()),
                            LOG_WARNING
                        );
                        continue;
                    }
                    
                    $jobId = $request['request_id'] ?? uniqid('job_'.$request['action'], true);
                    
                    if (!$this->shouldProcessJob($jobId)) {
                        continue;
                    }

                    // Логируем, какой воркер взял задачу в обработку
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf(
                            "Worker instance #%d (PID:%d) taking job: %s, action: %s",
                            $this->instanceId,
                            getmypid(),
                            $jobId,
                            $request['action'] ?? 'unknown'
                        ),
                        LOG_DEBUG
                    );
                    
                    // Сохраняем информацию о том, какой воркер обрабатывает задачу
                    $this->redis->setex(
                        'api:job:worker:' . $jobId,
                        300, // 5 минут TTL
                        json_encode([
                            'instance_id' => $this->instanceId,
                            'pid' => getmypid(),
                            'started_at' => microtime(true)
                        ])
                    );
                    
                    // Process the job
                    $this->processJobDirect($jobId, $requestData);
                    
                    // If worker is in shutdown mode, exit after completing this job
                    if ($this->isShuttingDown) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Worker completed final job and is now exiting",
                            LOG_NOTICE
                        );
                        break;
                    }
                    
                } catch (Throwable $e) {
                    CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    sleep(1);
                }
            }
            
            SystemMessages::sysLogMsg(
                static::class,
                "Worker exiting gracefully",
                LOG_NOTICE
            );
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw $e;
        }
    }

    /**
     * Проверяем и логируем состояние очереди Redis
     */
    private function checkQueueState(): void
    {
        try {
            // Получаем длину основной очереди
            $queueLength = $this->redis->lLen(self::REDIS_API_QUEUE);
            
            // Проверяем все ключи с ответами
            $responseKeys = $this->redis->keys(self::REDIS_API_RESPONSE_PREFIX . '*');
            $responseCount = count($responseKeys);
            
            // Проверяем ожидающие запросы
            $jobsInProgressKeys = $this->redis->keys('api:job:worker:*');
            $jobsInProgress = count($jobsInProgressKeys);
            
            // Логируем информацию о состоянии очереди
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Queue state: %d requests waiting, %d responses pending, %d jobs in progress - WorkerID %d/%d",
                    $queueLength,
                    $responseCount,
                    $jobsInProgress,
                    $this->instanceId,
                    $this->maxProc
                ),
                LOG_INFO
            );
            
            // Если есть задачи в очереди, но нет воркеров, которые их обрабатывают, выводим предупреждение
            if ($queueLength > 0 && $jobsInProgress === 0) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "WARNING: %d requests in queue but no active jobs in progress!",
                        $queueLength
                    ),
                    LOG_WARNING
                );
                
                // Дополнительно проверяем, какие задачи находятся в очереди
                $queueItems = $this->redis->lRange(self::REDIS_API_QUEUE, 0, 5); // Первые 5 элементов
                foreach ($queueItems as $index => $queueItem) {
                    $item = json_decode($queueItem, true);
                    if (is_array($item)) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Queue item %d: ID=%s, Action=%s, Processor=%s",
                                $index,
                                $item['request_id'] ?? 'unknown',
                                $item['action'] ?? 'unknown',
                                $item['processor'] ?? 'unknown'
                            ),
                            LOG_INFO
                        );
                    }
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                sprintf("Error checking queue state: %s", $e->getMessage()),
                LOG_WARNING
            );
        }
    }

    /**
     * Determine if job should be processed based on retry count
     *
     * @param string $jobId Unique job identifier
     * @return bool True if job should be processed
     */
    private function shouldProcessJob(string $jobId): bool
    {
        $attemptKey = self::REDIS_JOB_ATTEMPTS_PREFIX . $jobId;
        $attempts = (int)$this->redis->get($attemptKey) + 1;

        if ($attempts > self::MAX_JOB_ATTEMPTS) {
            $this->handleFailedJob($jobId);
            return false;
        }

        $this->redis->setex($attemptKey, self::FAILED_JOB_TTL, (string)$attempts);
        return true;
    }


    /**
     * Get processor class for request
     *
     * @param array $request Request data
     * @return string Processor class name
     * @throws RuntimeException If processor not specified
     */
    private function getProcessor(array $request): string
    {
        if (empty($request['processor'])) {
            throw new RuntimeException('Processor not specified in request');
        }
        
        // Old style compatibility, can be removed in 2025
        if ($request['processor'] === 'modules') {
            $request['processor'] = PbxExtensionsProcessor::class;
        }

        return $request['processor'];
    }

    /**
     * Handle processing errors and update result object
     *
     * @param Throwable $exception Exception that occurred
     * @param PBXApiResult $res Result object to update
     */
    private function handleProcessingError(Throwable $exception, PBXApiResult $res): void
    {
        $res->messages['error'][] = CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        $res->success = false;
    }

    /**
     * Handle asynchronous request execution
     *
     * Immediately responds to client with acknowledgment and continues processing in background.
     * Results will be sent via NCHAN channel.
     *
     * @param array $request The API request data
     * @param PBXApiResult $res The result object
     * @param string $processor The processor class name
     */
    private function handleAsyncRequest(
        array $request,
        PBXApiResult $res,
        string $processor
    ): void {
        // Prepare immediate success response for client
        $res->success = true;
        $res->messages['info'][] = sprintf(
            'The async job %s starts in background, you will receive answer on %s nchan channel',
            $request['action'],
            $request['asyncChannelId']
        );

        // Send immediate response
        $this->sendResponse($request['request_id'] ?? '', $request, $res->getResult());

        // Execute the actual processor callback
        $processor::callback($request);
    }

    /**
     * Handle job processing errors
     *
     * Records error details and determines if job should be retried.
     *
     * @param string $jobId Unique job identifier
     * @param Throwable $error Error that occurred
     */
    private function handleJobError(string $jobId, Throwable $error): void
    {
        try {
            // Log error details
            $attempts = (int)$this->redis->get(self::REDIS_JOB_ATTEMPTS_PREFIX . $jobId);
            $errorData = [
                'job_id' => $jobId,
                'attempt' => $attempts,
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString(),
                'timestamp' => microtime(true)
            ];

            $this->redis->hSet(
                self::REDIS_JOB_ERRORS_PREFIX . $jobId,
                (string)$attempts,
                json_encode($errorData, JSON_THROW_ON_ERROR)
            );

            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    'Job %s failed (attempt %d/%d): %s',
                    $jobId,
                    $attempts,
                    self::MAX_JOB_ATTEMPTS,
                    $error->getMessage()
                ),
                LOG_WARNING
            );

        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Handle permanently failed job
     *
     * Records failure data and sends failure notification.
     *
     * @param string $jobId Unique job identifier
     */
    private function handleFailedJob(string $jobId): void
    {
        try {
            $failureData = [
                'job_id' => $jobId,
                'failed_at' => microtime(true),
                'attempts' => self::MAX_JOB_ATTEMPTS,
                'errors' => $this->redis->hGetAll(self::REDIS_JOB_ERRORS_PREFIX . $jobId)
            ];

            // Store failed job data for analysis
            $this->redis->hSet(
                self::REDIS_FAILED_JOBS_DATA,
                $jobId,
                json_encode($failureData, JSON_THROW_ON_ERROR)
            );

            // Send failure notification
            $res = new PBXApiResult();
            $res->success = false;
            $res->messages['error'][] = sprintf(
                'Job %s failed permanently after %d attempts',
                $jobId,
                self::MAX_JOB_ATTEMPTS
            );

            $this->sendResponse($jobId, [], $res->getResult());
            $this->cleanupJobData($jobId);

        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Send response through Redis
     *
     * Handles both normal and large responses with file fallback.
     *
     * @param string $jobId Unique job identifier
     * @param array $request Original request data
     * @param array $result Response data
     */
    private function sendResponse(string $jobId, array $request, array $result): void
    {
        try {
            // Performance metrics
            $perfMetrics = [
                'start' => microtime(true)
            ];
            
            $responseKey = WorkerApiCommands::REDIS_API_RESPONSE_PREFIX . ($request['request_id'] ?? $jobId);
            $encodedResult = json_encode($result, JSON_THROW_ON_ERROR);

            $perfMetrics['encoding_time'] = microtime(true) - $perfMetrics['start'];
            $perfMetrics['encoded_size'] = strlen($encodedResult);
            
            // Check if response is too large for Redis
            $largeResponseTime = 0;
            if (strlen($encodedResult) > self::MAX_RESPONSE_SIZE) {
                $largeResponseStart = microtime(true);
                $encodedResult = $this->handleLargeResponse($result);
                $largeResponseTime = microtime(true) - $largeResponseStart;
            }
            $perfMetrics['large_response_time'] = $largeResponseTime;
            
            // Store response in Redis
            $redisStart = microtime(true);
            
            // Store response with TTL
            $setResult = $this->redis->setex($responseKey, self::REDIS_RESPONSE_TTL, $encodedResult);
            
            // Store metrics for performance analysis (but not visible in logs)
            $metricsKey = "api:metrics:{$request['request_id']}";
            $this->redis->setex($metricsKey, 3600, json_encode($perfMetrics));
            
            // Only log errors, not success cases
            if (!$setResult) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "WARNING: Failed to store response data for job %s. Retrying...",
                        $jobId
                    ),
                    LOG_WARNING
                );
                
                // Retry setting the data
                $retrySetResult = $this->redis->setex($responseKey, self::REDIS_RESPONSE_TTL, $encodedResult);
                
                if (!$retrySetResult) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf(
                            "CRITICAL: Retry set failed for job %s",
                            $jobId
                        ),
                        LOG_ERR
                    );
                }
            }
            
            // Double-check the data was stored, but only log errors
            $responseCheck = $this->redis->get($responseKey);
            if ($responseCheck === false) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "CRITICAL: Response data for job %s was not found in Redis after setting!",
                        $jobId
                    ),
                    LOG_ERR
                );
            }
            
            $perfMetrics['redis_time'] = microtime(true) - $redisStart;
            $perfMetrics['total_time'] = microtime(true) - $perfMetrics['start'];
            
            // Only log slow operations
            if ($perfMetrics['total_time'] > 0.5) {  // Increased threshold to 500ms
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Slow response delivery: %s (%.3fs) - size: %d bytes",
                        $request['action'] ?? 'unknown',
                        $perfMetrics['total_time'],
                        $perfMetrics['encoded_size']
                    ),
                    LOG_NOTICE
                );
            }

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Error during response delivery for job %s: %s",
                    $jobId,
                    $e->getMessage()
                ),
                LOG_ERR
            );
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Handle large response by compressing data before storage
     *
     * @param array $result Response data
     * @return string JSON encoded response with file or compressed data reference
     * @throws RuntimeException If file creation fails
     */
    private function handleLargeResponse(array $result): string
    {
        // Compress data using gzencode
        $compressedData = gzencode(serialize($result), 9); // Maximum compression
        
        // If compressed data is still too large for Redis, use file storage
        if (strlen($compressedData) > self::MAX_RESPONSE_SIZE) {
            return $this->handleLargeResponseWithFile($compressedData);
        }
        
        // Otherwise, store compressed data in Redis with special key
        $largeResponseKey = 'large_response:' . uniqid('', true);
        $this->redis->setex($largeResponseKey, self::REDIS_RESPONSE_TTL, $compressedData);
        
        // Return reference to compressed data in Redis
        return json_encode([
            'large_response_redis' => $largeResponseKey,
            'compressed' => true
        ], JSON_THROW_ON_ERROR);
    }
    
    /**
     * Handle extremely large response with file storage
     *
     * @param string $compressedData Compressed data to store in file
     * @return string JSON encoded response with file reference
     * @throws RuntimeException If file creation fails
     */
    private function handleLargeResponseWithFile(string $compressedData): string
    {
        $tempFile = sprintf(
            '%s/response_%s_%s.data',
            $this->di->getShared('config')->path('www.downloadCacheDir'),
            uniqid('', true),
            microtime(true)
        );

        if (!file_put_contents($tempFile, $compressedData)) {
            throw new RuntimeException('Failed to write response to temporary file');
        }

        $this->registerTempFile($tempFile);
        return json_encode([
            self::REDIS_RESPONSE_IN_FILE => $tempFile,
            'compressed' => true
        ], JSON_THROW_ON_ERROR);
    }

    /**
     * Register temporary file for cleanup
     *
     * @param string $filepath Path to temporary file
     */
    private function registerTempFile(string $filepath): void
    {
        $this->redis->rPush('temp_files', $filepath);
        $this->redis->expire('temp_files', self::REDIS_RESPONSE_TTL);
    }

    /**
     * Clean up job-related data
     *
     * @param string $jobId Job identifier
     */
    private function cleanupJobData(string $jobId): void
    {
        $keys = [
            self::REDIS_JOB_ATTEMPTS_PREFIX . $jobId,
            self::REDIS_JOB_ERRORS_PREFIX . $jobId
        ];

        foreach ($keys as $key) {
            $this->redis->del($key);
        }
    }

    /**
     * Process a job directly (without additional forking)
     * 
     * @param string $jobId Unique job identifier
     * @param string $requestData Job request data
     */
    private function processJobDirect(string $jobId, string $requestData): void
    {
        $request = json_decode($requestData, true);
        $res = new PBXApiResult();
        
        // Log job start with details
        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                "Starting job processing: ID=%s, Action=%s, Processor=%s, PID=%d",
                $jobId,
                $request['action'] ?? 'unknown',
                $request['processor'] ?? 'unknown',
                getmypid()
            ),
            LOG_INFO
        );
        
        // Сбор метрик производительности
        $perfMetrics = [
            'request_received_at' => microtime(true),
            'processing_stages' => [],
            'job_id' => $jobId,
            'action' => $request['action'] ?? 'unknown',
            'processor' => $request['processor'] ?? 'unknown',
            'pid' => getmypid()
        ];

        try {

            // Замер времени подготовки к обработке запроса
            $perfMetrics['processing_stages']['prepare'] = [
                'start' => microtime(true)
            ];
            
            $res->processor = $this->getProcessor($request);
            $processor = $res->processor;

            if (!method_exists($processor, 'callback')) {
                throw new RuntimeException("Unknown processor - {$processor}");
            }
            
            $perfMetrics['processing_stages']['prepare']['end'] = microtime(true);
            $perfMetrics['processing_stages']['prepare']['duration'] = 
                $perfMetrics['processing_stages']['prepare']['end'] - 
                $perfMetrics['processing_stages']['prepare']['start'];

            // Log processor details
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Job %s using processor: %s (prepare: %.3fs, PID: %d)",
                    $jobId,
                    $processor,
                    $perfMetrics['processing_stages']['prepare']['duration'],
                    getmypid()
                ),
                LOG_DEBUG
            );

            // Замер времени выполнения запроса
            $perfMetrics['processing_stages']['execution'] = [
                'start' => microtime(true)
            ];
            
            // Process request
            if (($request['async'] ?? false) === true) {
                $this->handleAsyncRequest($request, $res, $processor);
            } else {
                $res = $processor::callback($request);
            }
            
            $perfMetrics['processing_stages']['execution']['end'] = microtime(true);
            $perfMetrics['processing_stages']['execution']['duration'] = 
                $perfMetrics['processing_stages']['execution']['end'] - 
                $perfMetrics['processing_stages']['execution']['start'];

            // Log processor execution time
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Job %s execution completed: %s::%s (execution: %.3fs, PID: %d)",
                    $jobId,
                    $processor,
                    $request['action'] ?? 'unknown',
                    $perfMetrics['processing_stages']['execution']['duration'],
                    getmypid()
                ),
                LOG_INFO
            );
        } catch (Throwable $e) {
            // Log detailed error information
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Job %s execution failed: %s (%s:%d, PID: %d)",
                    $jobId,
                    $e->getMessage(),
                    $e->getFile(),
                    $e->getLine(),
                    getmypid()
                ),
                LOG_ERR
            );
            
            // Handle errors during processing
            $this->handleJobError($jobId, $e);
            $this->handleProcessingError($e, $res);
        } finally {

            // Завершающий расчет метрик
            $perfMetrics['request_completed_at'] = microtime(true);
            $perfMetrics['total_processing_time'] = 
                $perfMetrics['request_completed_at'] - $perfMetrics['request_received_at'];
            
            // Замер времени на подготовку ответа
            $perfMetrics['processing_stages']['response_preparation'] = [
                'start' => microtime(true)
            ];
            
            // Добавляем метрики в ответ
            $result = $res->getResult();
            $result['_performance'] = $perfMetrics;
            
            // Always send a response
            $this->sendResponse($jobId, $request, $result);
            
            $perfMetrics['processing_stages']['response_preparation']['end'] = microtime(true);
            $perfMetrics['processing_stages']['response_preparation']['duration'] = 
                $perfMetrics['processing_stages']['response_preparation']['end'] - 
                $perfMetrics['processing_stages']['response_preparation']['start'];
            
            // Log job completion metrics
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Job %s completed: action=%s, total=%.3fs, success=%s, PID=%d",
                    $jobId,
                    $request['action'] ?? 'unknown',
                    $perfMetrics['total_processing_time'],
                    $res->success ? 'true' : 'false',
                    getmypid()
                ),
                $res->success ? LOG_INFO : LOG_WARNING
            );
            
            // Логируем информацию о выполнении для запросов, которые выполняются более 0.5 секунды
            if ($perfMetrics['total_processing_time'] > 0.5) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Long-running request: %s (%.3fs) - execution: %.3fs, response prep: %.3fs, PID: %d",
                        $request['action'] ?? 'unknown',
                        $perfMetrics['total_processing_time'],
                        $perfMetrics['processing_stages']['execution']['duration'] ?? 0,
                        $perfMetrics['processing_stages']['response_preparation']['duration'] ?? 0,
                        getmypid()
                    ),
                    LOG_NOTICE
                );
            }
        }
    }
}


// Start worker process
WorkerApiCommands::startWorker($argv ?? []);
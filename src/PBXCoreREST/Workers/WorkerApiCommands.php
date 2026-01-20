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
use MikoPBX\PBXCoreREST\Lib\PerformanceMetrics;
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
 * - Request processing with worker pool support
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
                    
                    // Periodically check queue state (every minute)
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

                    // Log which worker is processing the job
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
                    
                    // Save information about which worker is processing the job
                    $this->redis->setex(
                        'api:job:worker:' . $jobId,
                        300, // 5 minutes TTL
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
     * Check and log Redis queue state
     */
    private function checkQueueState(): void
    {
        try {
            // Get main queue length
            $queueLength = $this->redis->lLen(self::REDIS_API_QUEUE);
            
            // Check all response keys
            $responseKeys = $this->redis->keys(self::REDIS_API_RESPONSE_PREFIX . '*');
            $responseCount = count($responseKeys);
            
            // Check pending requests
            $jobsInProgressKeys = $this->redis->keys('api:job:worker:*');
            $jobsInProgress = count($jobsInProgressKeys);
            
            // Log queue state information
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
            
            // If there are tasks in queue but no workers processing them, show warning
            if ($queueLength > 0 && $jobsInProgress === 0) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "WARNING: %d requests in queue but no active jobs in progress!",
                        $queueLength
                    ),
                    LOG_WARNING
                );
                
                // Additionally check which tasks are in the queue
                $queueItems = $this->redis->lRange(self::REDIS_API_QUEUE, 0, 5); // First 5 items
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

            // Clean UTF-8 data before encoding to prevent JSON encoding errors
            $result = $this->cleanUtf8Data($result);
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
            // WHY: If setex() returns true, Redis guarantees data is written
            // Double-checking with get() can cause false positives due to:
            // - Redis eviction policies when memory is low
            // - Network latency between setex and get
            // - Race conditions with other processes
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
                            "CRITICAL: Retry set failed for job %s - possible Redis memory issue",
                            $jobId
                        ),
                        LOG_ERR
                    );
                }
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
     * Process a job directly
     * 
     * @param string $jobId Unique job identifier
     * @param string $requestData Job request data
     */
    private function processJobDirect(string $jobId, string $requestData): void
    {
        $request = json_decode($requestData, true);
        $res = new PBXApiResult();
        
        $this->logJobStart($jobId, $request);
        
        // Initialize performance metrics
        $metrics = new PerformanceMetrics($jobId, $request);

        try {
            // Prepare and validate processor
            $processor = $this->prepareProcessor($request, $res, $metrics);

            // Execute request
            $res = $this->executeRequest($request, $res, $processor, $metrics);
            
        } catch (Throwable $e) {
            $this->handleJobFailure($jobId, $e, $res);
        } finally {
            $this->finalizeJob($jobId, $request, $res, $metrics);
        }
    }
    
    /**
     * Log job start information
     * 
     * @param string $jobId Job identifier
     * @param array $request Request data
     */
    private function logJobStart(string $jobId, array $request): void
    {
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
    }
    
    /**
     * Prepare and validate processor
     * 
     * @param array $request Request data
     * @param PBXApiResult $res Result object
     * @param PerformanceMetrics $metrics Performance metrics
     * @return string Processor class name
     * @throws RuntimeException If processor is invalid
     */
    private function prepareProcessor(array $request, PBXApiResult $res, PerformanceMetrics $metrics): string
    {
        $metrics->startStage('prepare');
        
        $res->processor = $this->getProcessor($request);
        $processor = $res->processor;

        if (!method_exists($processor, 'callback')) {
            throw new RuntimeException("Unknown processor - {$processor}");
        }
        
        $metrics->endStage('prepare');
        $metrics->logPreparationComplete($processor);
        
        return $processor;
    }
    
    /**
     * Execute the API request
     * 
     * @param array $request Request data
     * @param PBXApiResult $res Result object
     * @param string $processor Processor class name
     * @param PerformanceMetrics $metrics Performance metrics
     * @return PBXApiResult Request result
     */
    private function executeRequest(array $request, PBXApiResult $res, string $processor, PerformanceMetrics $metrics): PBXApiResult
    {
        $metrics->startStage('execution');
        
        if (($request['async'] ?? false) === true) {
            $this->handleAsyncRequest($request, $res, $processor);
        } else {
            $res = $processor::callback($request);
        }
        
        $metrics->endStage('execution');
        $metrics->logExecutionComplete($processor);
        
        return $res;
    }
    
    /**
     * Handle job failure
     * 
     * @param string $jobId Job identifier
     * @param Throwable $e Exception
     * @param PBXApiResult $res Result object
     */
    private function handleJobFailure(string $jobId, Throwable $e, PBXApiResult $res): void
    {
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
        
        $this->handleJobError($jobId, $e);
        $this->handleProcessingError($e, $res);
    }
    
    /**
     * Recursively clean UTF-8 data to prevent JSON encoding errors
     *
     * @param mixed $data Data to clean
     * @return mixed Cleaned data
     */
    private function cleanUtf8Data($data)
    {
        if (is_string($data)) {
            // Check if string is valid UTF-8
            if (!mb_check_encoding($data, 'UTF-8')) {
                // Try to convert to UTF-8
                $data = mb_convert_encoding($data, 'UTF-8', 'UTF-8');
            }
            // Remove any invalid UTF-8 sequences
            $data = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $data);
            return $data;
        } elseif (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->cleanUtf8Data($value);
            }
            return $data;
        } elseif (is_object($data)) {
            foreach ($data as $key => $value) {
                $data->$key = $this->cleanUtf8Data($value);
            }
            return $data;
        }

        return $data;
    }

    /**
     * Finalize job processing
     *
     * @param string $jobId Job identifier
     * @param array $request Request data
     * @param PBXApiResult $res Result object
     * @param PerformanceMetrics $metrics Performance metrics
     */
    private function finalizeJob(string $jobId, array $request, PBXApiResult $res, PerformanceMetrics $metrics): void
    {
        $metrics->startStage('response_preparation');

        // Finalize metrics (removed from response)
        $metrics->finalize();
        $result = $res->getResult();

        // Always send a response
        $this->sendResponse($jobId, $request, $result);
        
        $metrics->endStage('response_preparation');
        
        // Log completion
        $metrics->logJobCompletion($res->success);
    }
}


// Start worker process
WorkerApiCommands::startWorker($argv ?? []);
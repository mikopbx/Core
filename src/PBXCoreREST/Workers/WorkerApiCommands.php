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
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use Redis;
use RuntimeException;
use Throwable;
use MikoPBX\Core\System\Util;

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

    private const int MAX_PARALLEL_JOBS = 3;

    /**
     * System configuration
     */
    private const int REDIS_RESPONSE_TTL = 3600; // 1 hour
    private const int MAX_RESPONSE_SIZE = 1048576; // 1MB
    private const int FORK_PROCESS_TIMEOUT = 300; // 5 minutes
    private const int PROCESS_CHECK_INTERVAL = 100000; // 100ms

    /**
     * Redis client for API operations
     */
    private ?Redis $apiRedis = null;

    /**
     * Map of active worker jobs and processes
     * @var array<string, array>
     */
    private array $activeJobs = [];

    /**
     * Array of active worker processes
     */
    private array $workerPids = [];

    /**
     * Default to 5 concurrent worker processes instead of 1
     */
    public int $maxProc = 5;

    /**
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds
    }

    /**
     * Initialize WorkerApiCommands with Redis connections
     *
     * @throws RuntimeException If Redis initialization fails
     */
    public function __construct()
    {
        parent::__construct();
        $this->initializeApiRedis();
    }

    /**
     * Initialize Redis connection for API operations with retry logic
     *
     * @param int $maxRetries Maximum number of retry attempts (default 3)
     * @param int $retryDelay Delay between retries in microseconds (default 500ms)
     * @throws RuntimeException If Redis initialization fails after all retries
     */
    private function initializeApiRedis(int $maxRetries = 3, int $retryDelay = 500000): void
    {
        $attempt = 0;
        $lastException = null;
        
        while ($attempt < $maxRetries) {
            try {
                $attempt++;
                
                // Close inherited connections if any
                if ($this->apiRedis) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Closing existing Redis connection before reinitializing (attempt {$attempt}/{$maxRetries})",
                        LOG_DEBUG
                    );
                    
                    try {
                        $this->apiRedis->close();
                    } catch (\Throwable $e) {
                        // Just log but continue - the connection might already be broken
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Error closing Redis connection: " . $e->getMessage(),
                            LOG_WARNING
                        );
                    }
                    
                    $this->apiRedis = null;
                }

                SystemMessages::sysLogMsg(
                    static::class,
                    "Initializing Redis client for API operations (attempt {$attempt}/{$maxRetries})",
                    LOG_DEBUG
                );
                
                // Get fresh Redis instance from DI
                $this->apiRedis = $this->di->get(RedisClientProvider::SERVICE_NAME);

                if ($this->apiRedis === null) {
                    throw new RuntimeException('Redis client provider returned null');
                }
                
                // Verify connection is working with ping
                $pingResult = $this->apiRedis->ping();
                if ($pingResult !== true) {
                    throw new RuntimeException("Redis ping test failed, returned: " . print_r($pingResult, true));
                }
                
                // Log successful connection details
                $connectionInfo = [];
                try {
                    $connectionInfo = [
                        'redis_version' => $this->apiRedis->info('server')['redis_version'] ?? 'unknown',
                        'connected_clients' => $this->apiRedis->info('clients')['connected_clients'] ?? 'unknown',
                        'used_memory' => $this->apiRedis->info('memory')['used_memory_human'] ?? 'unknown',
                        'uptime' => $this->apiRedis->info('server')['uptime_in_seconds'] ?? 'unknown',
                        'tcp_port' => $this->apiRedis->info('server')['tcp_port'] ?? 'unknown'
                    ];
                    
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Redis connection established successfully: " . json_encode($connectionInfo),
                        LOG_DEBUG
                    );
                } catch (Throwable $e) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Warning: Could not get Redis info after connection: " . $e->getMessage(),
                        LOG_WARNING
                    );
                }
                
                // Successful connection
                return;
                
            } catch (Throwable $e) {
                $lastException = $e;
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Redis connection attempt {$attempt}/{$maxRetries} failed: " . $e->getMessage(),
                    $attempt < $maxRetries ? LOG_WARNING : LOG_ERR
                );
                
                // Wait before retry if this isn't the last attempt
                if ($attempt < $maxRetries) {
                    usleep($retryDelay);
                }
            }
        }
        
        // If we get here, all attempts failed
        $errorMsg = 'Failed to initialize API Redis after ' . $maxRetries . ' attempts';
        if ($lastException) {
            $errorMsg .= ': ' . $lastException->getMessage();
        }
        
        CriticalErrorsHandler::handleExceptionWithSyslog($lastException ?? new RuntimeException($errorMsg));
        throw new RuntimeException($errorMsg);
    }

    /**
     * Set forked flag and reinitialize connections
     */
    protected function setForked(): void
    {
        parent::setForked();
        // Create new API Redis connection for forked process
        $this->initializeApiRedis();
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
            $this->setProcessType(self::PROCESS_TYPES['MAIN']);

            // Set up signal handling for graceful shutdown
            pcntl_signal(SIGUSR1, function () {
                $this->handleGracefulShutdown();
            });

            // Check for pending module post-installations immediately after worker starts
            // Use mutex to ensure this runs only once among multiple worker instances
            $mutexTimeout = 10; // 10 seconds should be enough for post-installations check
            $mutex = Util::createMutex('WorkerApiCommands', 'PostInstallation', $mutexTimeout);
            
            try {
                $mutex->synchronized(
                    function () {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Running module post-installations check with mutex lock",
                            LOG_NOTICE
                        );
                        ModuleInstallationBase::processModulePostInstallations($this->apiRedis);
                    }
                );
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Error during module post-installations: " . $e->getMessage(),
                    LOG_ERR
                );
            }

            // Initialize worker pool
            $this->initializeWorkerPool();

            // Monitor the worker pool and maintain a healthy state
            while ($this->needRestart === false) {
                try {
                    // Monitor worker pool and restart any dead workers
                    $this->monitorWorkerPool();
                    
                    // Send periodic heartbeat
                    $this->checkHeartbeat();
                    
                    // Process signals
                    pcntl_signal_dispatch();
                    
                    // Short sleep to prevent CPU overuse
                    usleep(self::PROCESS_CHECK_INTERVAL);
                } catch (Throwable $e) {
                    CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    sleep(1);
                }
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw $e;
        }
    }

    /**
     * Handle graceful shutdown
     */
    private function handleGracefulShutdown(): void
    {
        // Signal that we're in graceful shutdown mode
        SystemMessages::sysLogMsg(
            static::class,
            "Entering graceful shutdown mode - terminating worker pool",
            LOG_NOTICE
        );

        $this->setWorkerState(self::STATE_STOPPING);

        // Terminate all worker processes
        foreach ($this->workerPids as $workerId => $pid) {
            if (posix_kill($pid, 0)) {
                // Worker is still running, send SIGUSR1 for graceful shutdown
                posix_kill($pid, SIGUSR1);
                SystemMessages::sysLogMsg(
                    static::class,
                    "Sent graceful shutdown signal to worker {$workerId} (pid: {$pid})",
                    LOG_NOTICE
                );
            }
        }
        
        // Wait for workers to terminate
        $waitStart = microtime(true);
        $remainingWorkers = count($this->workerPids);
        
        while ($remainingWorkers > 0 && (microtime(true) - $waitStart) <= 10) {
            foreach ($this->workerPids as $workerId => $pid) {
                $result = pcntl_waitpid($pid, $status, WNOHANG);
                
                if ($result === $pid) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Worker {$workerId} (pid: {$pid}) shutdown complete",
                        LOG_NOTICE
                    );
                    
                    unset($this->workerPids[$workerId]);
                    $remainingWorkers--;
                }
            }
            
            if ($remainingWorkers > 0) {
                usleep(100000); // 100ms
            }
        }
        
        // Force terminate any remaining workers
        foreach ($this->workerPids as $workerId => $pid) {
            if (posix_kill($pid, 0)) {
                posix_kill($pid, SIGKILL);
                SystemMessages::sysLogMsg(
                    static::class,
                    "Forced termination of worker {$workerId} (pid: {$pid})",
                    LOG_WARNING
                );
            }
        }
        
        $this->needRestart = true;
    }

    /**
     * Process requests from Redis queue
     *
     * Checks both main and failed job queues for requests to process.
     * Handles job retries and error cases.
     */
    private function processRequestQueue(): void
    {
        try {
            // Only process if we have capacity and not shutting down
            if (count($this->activeJobs) >= self::MAX_PARALLEL_JOBS || $this->workerState === self::STATE_STOPPING) {
                return;
            }

            // Check both main and failed queues
            $queues = [self::REDIS_API_QUEUE, self::REDIS_FAILED_JOBS_QUEUE];
            $result = $this->apiRedis->blpop($queues, 1);

            if (!$result) {
                return;
            }

            [$queue, $requestData] = $result;

            $request = json_decode($requestData, true);
            $jobId = $request['request_id'] ?? uniqid('job:', true);

            // Check and update attempt count
            if (!$this->shouldProcessJob($jobId)) {
                return;
            }

            // Process the job
            $this->startJobProcessing($jobId, $requestData);
        } catch (\RedisException $e) {
            // Redis connection lost - it will be retried later
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
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
        $attempts = (int)$this->apiRedis->get($attemptKey) + 1;

        if ($attempts > self::MAX_JOB_ATTEMPTS) {
            $this->handleFailedJob($jobId);
            return false;
        }

        $this->apiRedis->setex($attemptKey, self::FAILED_JOB_TTL, (string)$attempts);
        return true;
    }

    /**
     * Start job processing in a worker process
     *
     * @param string $jobId Unique job identifier
     * @param string $requestData Job request data
     */
    private function startJobProcessing(string $jobId, string $requestData): void
    {
        // Create job info record first
        $this->activeJobs[$jobId] = [
            'start_time' => microtime(true),
            'request_data' => $requestData,
            'pid' => null
        ];

        // Use startWorkerProcess from parent class to handle the process creation
        $pid = $this->startWorkerProcess(function () use ($jobId, $requestData) {
            $this->processJob($jobId, $requestData);
            exit(0);
        });
        
        // Store PID with job
        $this->activeJobs[$jobId]['pid'] = $pid;
    }

    /**
     * Process a job in a worker process
     *
     * @param string $jobId Unique job identifier
     * @param string $requestData Job request data
     */
    private function processJob(string $jobId, string $requestData): void
    {
        $request = json_decode($requestData, true);
        $res = new PBXApiResult();

        try {
            // Set descriptive process title
            cli_set_process_title(sprintf(
                '%s_job_%s_%s',
                static::class,
                $jobId,
                $request['action'] ?? 'unknown'
            ));

            $res->processor = $this->getProcessor($request);
            $processor = $res->processor;

            if (!method_exists($processor, 'callback')) {
                throw new RuntimeException("Unknown processor - {$processor}");
            }

            // Process request
            if (($request['async'] ?? false) === true) {
                $this->handleAsyncRequest($request, $res, $processor);
            } else {
                $res = $processor::callback($request);
            }
        } catch (Throwable $e) {
            // Handle errors during processing
            $this->handleJobError($jobId, $e);
            $this->handleProcessingError($e, $res);
        } finally {
            // Always send a response
            $this->sendResponse($jobId, $request, $res->getResult());
            
            // Check if we need to restart workers AFTER response has been sent
            if ($res->success) {
                $this->checkNeedReload($request);
            }
        }
    }

    /**
     * Clean up finished jobs and their resources
     */
    private function cleanupFinishedJobs(): void
    {
        foreach ($this->activeJobs as $jobId => $jobInfo) {
            $pid = $jobInfo['pid'];
            if ($pid === null) {
                continue;
            }

            $result = pcntl_waitpid($pid, $status, WNOHANG);

            if ($result === $pid) {
                // Process completed
                if (pcntl_wexitstatus($status) !== 0) {
                    // Job failed, retry if attempts remain
                    if ($this->shouldProcessJob($jobId)) {
                        $this->apiRedis->rPush(self::REDIS_FAILED_JOBS_QUEUE, $jobInfo['request_data']);
                    }
                }
                
                // Remove from active jobs
                unset($this->activeJobs[$jobId]);
            } elseif ($result === 0) {
                // Process still running - check timeout
                $runtime = microtime(true) - $jobInfo['start_time'];
                if ($runtime > self::FORK_PROCESS_TIMEOUT) {
                    // Process hung, terminate it
                    posix_kill($pid, SIGKILL);
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Terminated hanging job {$jobId} (pid: {$pid}, exceeded {$this->FORK_PROCESS_TIMEOUT}s)",
                        LOG_WARNING
                    );
                    unset($this->activeJobs[$jobId]);
                }
            }
        }
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
            $attempts = (int)$this->apiRedis->get(self::REDIS_JOB_ATTEMPTS_PREFIX . $jobId);
            $errorData = [
                'job_id' => $jobId,
                'attempt' => $attempts,
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString(),
                'timestamp' => microtime(true)
            ];

            $this->managementRedis->hSet(
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
                'errors' => $this->managementRedis->hGetAll(self::REDIS_JOB_ERRORS_PREFIX . $jobId)
            ];

            // Store failed job data for analysis
            $this->managementRedis->hSet(
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
            // Замер времени кодирования и сжатия ответа
            $perfMetrics = [
                'start' => microtime(true)
            ];
            
            $responseKey = self::REDIS_API_RESPONSE_PREFIX . ($request['request_id'] ?? $jobId);
            $encodedResult = json_encode($result, JSON_THROW_ON_ERROR);

            $perfMetrics['encoding_time'] = microtime(true) - $perfMetrics['start'];
            $perfMetrics['encoded_size'] = strlen($encodedResult);
            
            // Замер времени на обработку больших ответов
            $largeResponseTime = 0;
            if (strlen($encodedResult) > self::MAX_RESPONSE_SIZE) {
                $largeResponseStart = microtime(true);
                $encodedResult = $this->handleLargeResponse($result);
                $largeResponseTime = microtime(true) - $largeResponseStart;
            }
            $perfMetrics['large_response_time'] = $largeResponseTime;
            
            // Замер времени на отправку ответа в Redis
            $redisStart = microtime(true);
            
            // Use multi/exec for atomic operation and better reliability
            $this->apiRedis->multi();
            
            // Store response with TTL
            $this->apiRedis->setex($responseKey, self::REDIS_RESPONSE_TTL, $encodedResult);
            
            // Store additional response time metrics
            $metricsKey = "api:metrics:{$request['request_id']}";
            $this->apiRedis->setex($metricsKey, 3600, json_encode($perfMetrics));
            
            // Execute Redis transaction
            $this->apiRedis->exec();
            
            // Now publish notification separately to ensure data is available before notification
            // Add a small delay to ensure data is fully available (especially for larger responses)
            usleep(5000); // 5ms delay
            
            // Publish notification for clients - do this after data is stored
            $this->apiRedis->publish($responseKey, 'ready');
            
            $perfMetrics['redis_time'] = microtime(true) - $redisStart;
            $perfMetrics['total_time'] = microtime(true) - $perfMetrics['start'];
            
            // Логируем медленные операции отправки
            if ($perfMetrics['total_time'] > 0.1) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Slow response delivery: %s (%.3fs) - size: %d bytes, redis: %.3fs",
                        $request['action'] ?? 'unknown',
                        $perfMetrics['total_time'],
                        $perfMetrics['encoded_size'],
                        $perfMetrics['redis_time']
                    ),
                    LOG_NOTICE
                );
            }

        } catch (Throwable $e) {
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
        $this->apiRedis->setex($largeResponseKey, self::REDIS_RESPONSE_TTL, $compressedData);
        
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
        $this->managementRedis->rPush('temp_files', $filepath);
        $this->managementRedis->expire('temp_files', self::REDIS_RESPONSE_TTL);
    }

    /**
     * Checks if the module or worker needs to be reloaded.
     *
     * @param array $request
     */
    private function checkNeedReload(array $request): void
    {
        $restartActions = $this->getNeedRestartActions();
        foreach ($restartActions as $processor => $actions) {
            foreach ($actions as $action) {
                if ($processor === $request['processor']
                    && $action === $request['action']) {
                    $this->needRestart = true;
                    Processes::restartAllWorkers();
                    return;
                }
            }
        }
    }

    /**
     * Returns array of processor => action that require worker restart
     *
     * @return array<string,string[]>
     */
    private function getNeedRestartActions(): array
    {
        return [
            SystemManagementProcessor::class => [
                'restoreDefault',
            ],
            // ModulesManagementProcessor::class => [
            //     'enableModule',
            //     'disableModule',
            //     'uninstallModule',
            // ],
        ];
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
            $this->apiRedis->del($key);
        }
    }

    /**
     * Initialize worker pool by creating multiple worker processes
     */
    private function initializeWorkerPool(): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            "Initializing worker pool with {$this->maxProc} worker processes",
            LOG_NOTICE
        );
        
        for ($i = 0; $i < $this->maxProc; $i++) {
            $this->startPoolWorker($i);
        }
    }
    
    /**
     * Start a worker process in the pool
     * 
     * @param int $workerId Worker identifier
     * @return int PID of the started worker
     */
    private function startPoolWorker(int $workerId): int
    {
        $pid = pcntl_fork();
        
        if ($pid === -1) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to fork worker process {$workerId}",
                LOG_ERR
            );
            return 0;
        }
        
        if ($pid === 0) {
            // Child process
            try {
                $this->setForked();
                $this->runWorker($workerId);
                exit(0);
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                exit(1);
            }
        }
        
        // Parent process - store PID
        $this->workerPids[$workerId] = $pid;
        SystemMessages::sysLogMsg(
            static::class,
            "Started worker {$workerId} with PID {$pid}",
            LOG_NOTICE
        );
        
        return $pid;
    }
    
    /**
     * Run worker process to handle jobs from queue
     * 
     * @param int $workerId Worker identifier
     */
    private function runWorker(int $workerId): void
    {
        cli_set_process_title(sprintf("%s_worker_%d", static::class, $workerId));
        
        // Create new Redis connections for the worker
        $this->initializeApiRedis();

        // Set up signal handling for graceful worker shutdown
        pcntl_signal(SIGUSR1, function () use ($workerId) {
            SystemMessages::sysLogMsg(
                static::class,
                "Worker {$workerId} received shutdown signal, exiting gracefully",
                LOG_NOTICE
            );
            exit(0);
        });
        
        // Process requests until shutdown
        while ($this->workerState !== self::STATE_STOPPING) {
            try {
                // Process signals
                pcntl_signal_dispatch();
                
                // Proactively check Redis connection before attempting BLPOP
                try {
                    $pingResult = $this->apiRedis->ping();
                    if ($pingResult !== true) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Redis ping check failed before BLPOP, reconnecting. Result: " . print_r($pingResult, true),
                            LOG_WARNING
                        );
                        $this->initializeApiRedis();
                        // Short delay after reconnection
                        usleep(100000); // 100ms
                    }
                } catch (\Throwable $e) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Redis ping check exception: " . $e->getMessage() . ". Reconnecting.",
                        LOG_WARNING
                    );
                    $this->initializeApiRedis();
                    usleep(100000); // 100ms
                }
                
                // Get job from queue with 5 second timeout
                $result = $this->apiRedis->blpop(
                    [self::REDIS_API_QUEUE, self::REDIS_FAILED_JOBS_QUEUE], 
                    5
                );
                
                // Enhanced diagnostic logging for unexpected BLPOP results
                if (is_array($result) && count($result) === 0) {
                    // Это нормальное поведение при тайм-ауте - нет доступных заданий
                    continue;
                }
                
                // Проверка, что результат - массив с двумя элементами
                if (!is_array($result) || count($result) !== 2) {
                    // Результат не является корректным массивом из двух элементов
                    if ($result !== false && $result !== null) {
                        // Special handling for empty array case already done above
                        
                        // Get Redis connection info for diagnostics
                        $redisInfo = [];
                        try {
                            $pingResult = $this->apiRedis->ping();
                            $redisInfo['ping'] = ($pingResult === true) ? 'OK' : 'FAILED';
                            $redisInfo['ping_actual'] = print_r($pingResult, true);
                            $redisInfo['role'] = $this->apiRedis->info('replication')['role'] ?? 'unknown';
                            $redisInfo['queue_lengths'] = [
                                'api_queue' => $this->apiRedis->lLen(self::REDIS_API_QUEUE),
                                'failed_jobs_queue' => $this->apiRedis->lLen(self::REDIS_FAILED_JOBS_QUEUE)
                            ];
                            $redisInfo['memory_usage'] = $this->apiRedis->info('memory')['used_memory_human'] ?? 'unknown';
                            $redisInfo['connected_clients'] = $this->apiRedis->info('clients')['connected_clients'] ?? 'unknown';
                        } catch (\Throwable $e) {
                            $redisInfo['error'] = $e->getMessage();
                        }
                        
                        // Log the unexpected format with detailed diagnostics
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Unexpected BLPOP result format: %s | Redis state: %s", 
                                is_array($result) ? 'array[' . count($result) . ']' . json_encode($result) : gettype($result),
                                json_encode($redisInfo)
                            ),
                            LOG_WARNING
                        );
                        
                        // Try to recover the connection if possible
                        // Проверяем результат ping именно на true (булево значение)
                        try {
                            $pingCheck = $this->apiRedis->ping();
                            if ($pingCheck !== true) {
                                SystemMessages::sysLogMsg(
                                    static::class,
                                    "Redis ping check failed: " . print_r($pingCheck, true) . ", attempting to reconnect",
                                    LOG_WARNING
                                );
                                $this->initializeApiRedis();
                            }
                        } catch (\Throwable $e) {
                            SystemMessages::sysLogMsg(
                                static::class,
                                "Redis ping check exception: " . $e->getMessage() . ", attempting to reconnect",
                                LOG_WARNING
                            );
                            try {
                                $this->initializeApiRedis();
                            } catch (\Throwable $reconnectEx) {
                                SystemMessages::sysLogMsg(
                                    static::class,
                                    "Redis reconnection failed: " . $reconnectEx->getMessage(),
                                    LOG_ERR
                                );
                            }
                        }
                    }
                    // No job available or invalid format, check signals and continue
                    continue;
                }
                
                // Безопасная деструктуризация массива
                [$queue, $requestData] = $result;
                
                // Проверка типа данных requestData
                if (!is_string($requestData)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf("Invalid job data type: %s", gettype($requestData)),
                        LOG_WARNING
                    );
                    continue;
                }
                
                // Проверка валидности JSON
                $request = json_decode($requestData, true);
                if ($request === null && json_last_error() !== JSON_ERROR_NONE) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf("Invalid JSON in job data: %s", json_last_error_msg()),
                        LOG_WARNING
                    );
                    continue;
                }
                
                $jobId = $request['request_id'] ?? uniqid('job:', true);
                
                if (!$this->shouldProcessJob($jobId)) {
                    continue;
                }
                
                // Process the job directly (no forking)
                $this->processJobDirect($jobId, $requestData);
                
                // Reset worker state after job completion
                $this->resetWorkerState($workerId);
                
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                // Short delay before next job
                sleep(1);
            }
        }
    }
    
    /**
     * Monitor worker pool and restart any dead workers
     */
    private function monitorWorkerPool(): void
    {
        foreach ($this->workerPids as $workerId => $pid) {
            $result = pcntl_waitpid($pid, $status, WNOHANG);
            
            if ($result === $pid) {
                // Worker process ended - restart it
                SystemMessages::sysLogMsg(
                    static::class,
                    "Worker {$workerId} (PID: {$pid}) exited, restarting...",
                    LOG_WARNING
                );
                
                // Restart worker
                $this->startPoolWorker($workerId);
            }
        }
    }
    
    /**
     * Reset worker state after job completion
     * 
     * @param int $workerId Worker identifier
     */
    private function resetWorkerState(int $workerId): void
    {
        // Reset process title to idle state
        cli_set_process_title(sprintf("%s_worker_%d_idle", static::class, $workerId));
        
        // Encourage garbage collection
        gc_collect_cycles();
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
                "Starting job processing: ID=%s, Action=%s, Processor=%s",
                $jobId,
                $request['action'] ?? 'unknown',
                $request['processor'] ?? 'unknown'
            ),
            LOG_INFO
        );
        
        // Сбор метрик производительности
        $perfMetrics = [
            'request_received_at' => microtime(true),
            'processing_stages' => [],
            'job_id' => $jobId,
            'action' => $request['action'] ?? 'unknown',
            'processor' => $request['processor'] ?? 'unknown'
        ];

        try {
            // Set descriptive process title
            cli_set_process_title(sprintf(
                '%s_job_%s_%s',
                static::class,
                $jobId,
                $request['action'] ?? 'unknown'
            ));

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
                    "Job %s using processor: %s (prepare: %.3fs)",
                    $jobId,
                    $processor,
                    $perfMetrics['processing_stages']['prepare']['duration']
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
                    "Job %s execution completed: %s::%s (execution: %.3fs)",
                    $jobId,
                    $processor,
                    $request['action'] ?? 'unknown',
                    $perfMetrics['processing_stages']['execution']['duration']
                ),
                LOG_INFO
            );
        } catch (Throwable $e) {
            // Log detailed error information
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Job %s execution failed: %s (%s:%d)",
                    $jobId,
                    $e->getMessage(),
                    $e->getFile(),
                    $e->getLine()
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
                    "Job %s completed: action=%s, total=%.3fs, success=%s",
                    $jobId,
                    $request['action'] ?? 'unknown',
                    $perfMetrics['total_processing_time'],
                    $res->success ? 'true' : 'false'
                ),
                $res->success ? LOG_INFO : LOG_WARNING
            );
            
            // Логируем информацию о выполнении для запросов, которые выполняются более 0.5 секунды
            if ($perfMetrics['total_processing_time'] > 0.5) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Long-running request: %s (%.3fs) - execution: %.3fs, response prep: %.3fs",
                        $request['action'] ?? 'unknown',
                        $perfMetrics['total_processing_time'],
                        $perfMetrics['processing_stages']['execution']['duration'] ?? 0,
                        $perfMetrics['processing_stages']['response_preparation']['duration'] ?? 0
                    ),
                    LOG_NOTICE
                );
            }
            
            // Check if we need to restart workers AFTER response has been sent
            if ($res->success) {
                $this->checkNeedReload($request);
            }
        }
    }
}


// Start worker process
WorkerApiCommands::startWorker($argv ?? []);
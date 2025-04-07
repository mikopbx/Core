<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\{Processes, SystemMessages};
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use Redis;
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
     * Map of active worker processes
     * @var array<int, array>
     */
    private array $activeProcesses = [];

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
     * Initialize Redis connection for API operations
     *
     * @throws RuntimeException If Redis connection fails
     */
    private function initializeApiRedis(): void
    {
        try {
            // Close inherited connections
            if ($this->apiRedis) {
                $this->apiRedis->close();
                $this->apiRedis = null;
            }

            $this->apiRedis = RedisClientProvider::getApiRequestsConnection($this->di);

            if ($this->apiRedis === null ) {
                throw new RuntimeException('Failed to reconnect to Redis');
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
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

            while ($this->needRestart === false) {
                try {
                    $this->processRequestQueue();
                    $this->cleanupFinishedProcesses();
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
     * Process requests from Redis queue
     *
     * Checks both main and failed job queues for requests to process.
     * Handles job retries and error cases.
     */
    private function processRequestQueue(): void
    {
        try {
            // Check both main and failed queues
            $queues = [self::REDIS_API_QUEUE, self::REDIS_FAILED_JOBS_QUEUE];
            $result = $this->apiRedis->blpop($queues, 1);

            if (!$result) {
                return;
            }

            [$queue, $requestData] = $result;

            if (count($this->activeProcesses) >= self::MAX_PARALLEL_JOBS) {
                // Requeue the job to be processed later
                $this->apiRedis->rPush($queue, $requestData);
                return;
            }

            $request = json_decode($requestData, true);
            $jobId = $request['request_id'] ?? uniqid('job:', true);

            // Check and update attempt count
            if (!$this->shouldProcessJob($jobId)) {
                return;
            }

            // Process the job in a forked subprocess
            $this->forkAndProcessJob($jobId, $requestData);
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
     * Fork process and handle job
     *
     * Creates a new subprocess to handle the request and monitors its execution.
     *
     * @param string $jobId Unique job identifier
     * @param string $requestData Job request data
     */
    private function forkAndProcessJob(string $jobId, string $requestData): void
    {
        $pid = pcntl_fork();

        if ($pid === -1) {
            throw new RuntimeException("Failed to fork process for job $jobId");
        }

        if ($pid === 0) {
            // Child process
            try {
                $this->setForked();
                $this->setProcessType(self::PROCESS_TYPES['WORKER']);
                $this->handleRequest($jobId, $requestData);
                exit(0);
            } catch (Throwable $e) {
                $this->handleJobError($jobId, $e);
                exit(1);
            }
        }

        // Parent process - track child
        $this->activeProcesses[$pid] = [
            'job_id' => $jobId,
            'start_time' => microtime(true),
            'request_data' => $requestData
        ];
    }

    /**
     * Handle request processing in child process
     *
     * @param string $jobId Unique job identifier
     * @param string $requestData Request data to process
     */
    private function handleRequest(string $jobId, string $requestData): void
    {
        $request = json_decode($requestData, true);
        $res = new PBXApiResult();

        try {
            $res->processor = $this->getProcessor($request);
            $processor = $res->processor;

            if (!method_exists($processor, 'callback')) {
                throw new RuntimeException("Unknown processor - {$processor}");
            }

            cli_set_process_title(sprintf(
                '%s_job_%s_%s',
                static::class,
                $jobId,
                $request['action'] ?? 'unknown'
            ));

            // Process request
            if (($request['async'] ?? false) === true) {
                $this->handleAsyncRequest($request, $res, $processor);
            } else {
                $res = $processor::callback($request);
            }

            // Check if we need to restart workers
            if ($res->success) {
                $this->checkNeedReload($request);
            }
        } catch (Throwable $e) {
            $this->handleProcessingError($e, $res);
        } finally {
            $this->sendResponse($jobId, $request, $res->getResult());
        }
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
            ModulesManagementProcessor::class => [
                'enableModule',
                'disableModule',
                'uninstallModule',
            ],
        ];
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
            $responseKey = self::REDIS_API_RESPONSE_PREFIX . ($request['request_id'] ?? $jobId);
            $encodedResult = json_encode($result, JSON_THROW_ON_ERROR);

            if (strlen($encodedResult) > self::MAX_RESPONSE_SIZE) {
                $encodedResult = $this->handleLargeResponse($result);
            }

            // Store response with TTL
            $this->apiRedis->setex($responseKey, self::REDIS_RESPONSE_TTL, $encodedResult);

            // Notify clients
            $this->pubSubRedis->publish($responseKey, 'ready');

        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Handle large response by storing in file
     *
     * @param array $result Response data
     * @return string JSON encoded response with file reference
     * @throws RuntimeException If file creation fails
     */
    private function handleLargeResponse(array $result): string
    {
        $tempFile = sprintf(
            '%s/response_%s_%s.data',
            $this->di->getShared('config')->path('www.downloadCacheDir'),
            uniqid('', true),
            microtime(true)
        );

        if (!file_put_contents($tempFile, serialize($result))) {
            throw new RuntimeException('Failed to write response to temporary file');
        }

        $this->registerTempFile($tempFile);
        return json_encode([self::REDIS_RESPONSE_IN_FILE => $tempFile], JSON_THROW_ON_ERROR);
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
     * Clean up finished processes and their resources
     */
    private function cleanupFinishedProcesses(): void
    {
        foreach ($this->activeProcesses as $pid => $processInfo) {
            $result = pcntl_waitpid($pid, $status, WNOHANG);

            if ($result === $pid) {
                unset($this->activeProcesses[$pid]); // Remove completed process
                // Process finished
                if (pcntl_wexitstatus($status) !== 0) {
                    $this->handleProcessFailure($processInfo);
                }
            } elseif ($result === 0) {
                // Process still running - check timeout
                $runtime = microtime(true) - $processInfo['start_time'];
                if ($runtime > self::FORK_PROCESS_TIMEOUT) {
                    $this->terminateHangingProcess($pid, $processInfo);
                }
            }
        }
    }

    /**
     * Handle process failure
     *
     * @param array $processInfo Information about the failed process
     */
    private function handleProcessFailure(array $processInfo): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                'Process for job %s failed with non-zero exit status',
                $processInfo['job_id']
            ),
            LOG_WARNING
        );

        // Retry job if attempts remain
        if ($this->shouldProcessJob($processInfo['job_id'])) {
            $this->apiRedis->rPush(self::REDIS_FAILED_JOBS_QUEUE, $processInfo['request_data']);
        }
    }

    /**
     * Terminate hanging process
     *
     * @param int $pid Process ID
     * @param array $processInfo Process information
     */
    private function terminateHangingProcess(int $pid, array $processInfo): void
    {
        posix_kill($pid, SIGKILL);
        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                'Terminated hanging process %d for job %s (exceeded %d seconds)',
                $pid,
                $processInfo['job_id'],
                self::FORK_PROCESS_TIMEOUT
            ),
            LOG_WARNING
        );
        unset($this->activeProcesses[$pid]);
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
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds§
    }

    /**
     * Safely handle Redis connections after fork
     */
    protected function setForked(): void
    {
        parent::setForked();
        // Create new connections for forked process
        $this->initializeApiRedis();
    }

}


// Start worker process
WorkerApiCommands::startWorker($argv ?? []);
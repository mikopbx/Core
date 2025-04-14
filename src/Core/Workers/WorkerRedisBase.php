<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use Redis;
use RuntimeException;
use Throwable;

/**
 * Base class for Redis-based workers with enhanced process management.
 * Provides functionality for Redis connection handling, heartbeat mechanism,
 * and worker lifecycle management.
 */
abstract class WorkerRedisBase extends WorkerBase
{
    /**
     * Redis connection configuration
     */
    protected const int REDIS_RECONNECT_INTERVAL = 5;
    protected const int REDIS_HEARTBEAT_INTERVAL = 5;
    protected const int REDIS_STATUS_TTL = 300;
    protected const int REDIS_HEARTBEAT_TTL = 10;

    /**
     * Redis pub/sub channels and keys
     */
    protected const string REDIS_COMMAND_CHANNEL_PREFIX = 'worker:cmd:';
    public const string REDIS_STATUS_KEY_PREFIX = 'worker:status:';
    public const string REDIS_HEARTBEAT_KEY_PREFIX = 'worker:heartbeat:';

    /**
     * Process types and states
     */
    protected const array PROCESS_TYPES = [
        'MAIN' => 'main',
        'HEARTBEAT' => 'heartbeat',
        'SUBSCRIBER' => 'subscriber',
        'WORKER' => 'worker'
    ];

    /**
     * Current process type
     */
    protected string $processType = self::PROCESS_TYPES['MAIN'];

    /**
     * Redis connections
     */
    protected ?Redis $managementRedis = null;

    /**
     * Child process PIDs
     */
    protected ?int $subscriberPid = null;
    
    /**
     * Last heartbeat time
     */
    protected float $lastHeartbeatTime = 0;

    /**
     * Initialize Redis-based worker with heartbeat and subscription management
     *
     * @throws RuntimeException If Redis initialization fails
     */
    public function __construct()
    {
        try {
            parent::__construct();

            // First initialize Redis
            $attempts = 0;
            $maxAttempts = 3;

            while ($attempts < $maxAttempts) {
                try {
                    $this->initializeRedis();
                    break;
                } catch (Throwable $e) {
                    $attempts++;
                    if ($attempts === $maxAttempts) {
                        throw $e;
                    }
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Retry {$attempts} initializing Redis: " . $e->getMessage(),
                        LOG_WARNING
                    );
                    sleep(1);
                }
            }
            
            // Set last heartbeat time
            $this->lastHeartbeatTime = microtime(true);
            // Initial heartbeat
            $this->updateWorkerStatus();

        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw new RuntimeException('Failed to initialize Redis worker: ' . $e->getMessage());
        }
    }

    /**
     * Set process type and update process title
     */
    protected function setProcessType(string $type): void
    {
        $this->processType = $type;
        cli_set_process_title(sprintf(
            '%s_%s',
            static::class,
            strtolower($type)
        ));
    }
    /**
     * Initialize Redis connections
     *
     * @throws RuntimeException If Redis connections cannot be established
     */
    protected function initializeRedis(): void
    {
        if (!$this->di->has(RedisClientProvider::SERVICE_NAME)) {
            $this->di->register(new RedisClientProvider());
        }

        $this->managementRedis = $this->di->get(RedisClientProvider::SERVICE_NAME);

        if ($this->managementRedis === null) {
            throw new RuntimeException('Failed to initialize Redis connections');
        }

        $this->updateWorkerStatus();
    }

    protected function handleSignals(): void
    {
        pcntl_signal(SIGUSR1, function ($signal) {
            try {
                switch($this->processType) {
                    case self::PROCESS_TYPES['MAIN']:
                        // Main process - clean shutdown
                        $this->setWorkerState(self::STATE_STOPPING);

                        // Kill subscriber if exists (non-blocking)
                        if ($this->subscriberPid !== null) {
                            posix_kill($this->subscriberPid, SIGTERM);
                        }

                        // Wait for children to finish
                        pcntl_wait($status);

                        // Clean up Redis keys
                        $this->cleanupRedisKeys();
                        break;

                    case self::PROCESS_TYPES['SUBSCRIBER']:
                    case self::PROCESS_TYPES['WORKER']:
                        // Child processes - clean exit
                        if ($this->managementRedis) {
                            $this->managementRedis->close();
                        }
                        break;
                }

                SystemMessages::sysLogMsg(
                    static::class,
                    "Clean shutdown of {$this->processType} process",
                    LOG_DEBUG
                );
                exit(0);

            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Error during shutdown: " . $e->getMessage(),
                    LOG_ERR
                );
                exit(1);
            }
        });

        pcntl_signal_dispatch();
    }

    /**
     * Clean up Redis keys on shutdown
     */
    private function cleanupRedisKeys(): void
    {
        if ($this->managementRedis === null) {
            return;
        }

        try {
            $keys = [
                self::REDIS_STATUS_KEY_PREFIX . static::class,
                self::REDIS_HEARTBEAT_KEY_PREFIX . static::class
            ];
            foreach ($keys as $key) {
                $this->managementRedis->del($key);
            }
        } catch (Throwable $e) {
            // Log but continue shutdown
            SystemMessages::sysLogMsg(
                static::class,
                "Error cleaning Redis keys: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Handle command messages
     *
     * @param array $data Command data
     */
    protected function handleCommandMessage(array $data): void
    {
        if (!isset($data['action'])) {
            return;
        }

        switch ($data['action']) {
            case 'shutdown':
                $this->initiateGracefulShutdown();
                break;
            case 'status':
                $this->updateWorkerStatus();
                break;
            default:
                SystemMessages::sysLogMsg(
                    static::class,
                    "Unknown command received: {$data['action']}",
                    LOG_WARNING
                );
        }
    }

    /**
     * Update worker status in Redis
     */
    protected function updateWorkerStatus(): void
    {
        if ($this->managementRedis === null) {
            return;
        }

        try {
            $status = [
                'pid' => getmypid(),
                'class' => static::class,
                'state' => $this->workerState,
                'start_time' => $this->workerStartTime,
                'subscriber_pid' => $this->subscriberPid,
                'updated_at' => microtime(true),
                'memory_usage' => memory_get_usage(true)
            ];

            $statusKey = self::REDIS_STATUS_KEY_PREFIX . static::class;
            $heartbeatKey = self::REDIS_HEARTBEAT_KEY_PREFIX . static::class;

            // Set status and heartbeat with TTL
            $this->managementRedis->setex($statusKey, self::REDIS_STATUS_TTL, json_encode($status));
            $this->managementRedis->setex($heartbeatKey, self::REDIS_HEARTBEAT_TTL, (string)time());
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Initiate graceful shutdown of the worker
     */
    protected function initiateGracefulShutdown(): void
    {
        $this->setWorkerState(self::STATE_STOPPING);

        // Terminate subscriber process if exists
        if ($this->subscriberPid !== null && posix_kill($this->subscriberPid, 0)) {
            posix_kill($this->subscriberPid, SIGTERM);
        }

        // Clean up Redis keys
        if ($this->managementRedis !== null) {
            $keys = [
                self::REDIS_STATUS_KEY_PREFIX . static::class,
                self::REDIS_HEARTBEAT_KEY_PREFIX . static::class
            ];
            foreach ($keys as $key) {
                $this->managementRedis->del($key);
            }
        }

        exit(0);
    }

    /**
     * Safely handle Redis connections after fork
     */
    protected function setForked(): void
    {
        parent::setForked();

        if ($this->managementRedis) {
            $this->managementRedis->close();
            $this->managementRedis = null;
        }

        // Create new connections for forked process
        $this->initializeRedis();
    }

      /**
     * Start a worker process
     * 
     * @param callable $taskFunction The function to execute in worker process
     * @return int The PID of the started worker
     */
    protected function startWorkerProcess(callable $taskFunction): int
    {
        $pid = pcntl_fork();

        if ($pid === -1) {
            throw new RuntimeException('Failed to fork worker process');
        }

        if ($pid === 0) {
            // This is the child process
            try {
                $this->setForked();
                $this->setProcessType(self::PROCESS_TYPES['WORKER']);
                $taskFunction();
                exit(0);
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                exit(1);
            }
        }
        return $pid;
    }

    /**
     * Check if heartbeat should be sent
     */
    protected function checkHeartbeat(): void
    {
        $now = microtime(true);
        if (($now - $this->lastHeartbeatTime) >= self::REDIS_HEARTBEAT_INTERVAL) {
            $this->updateWorkerStatus();
            $this->lastHeartbeatTime = $now;
        }
    }
}
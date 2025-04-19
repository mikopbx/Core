<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
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
     * Redis keys for status tracking
     */
    public const string REDIS_STATUS_KEY_PREFIX = 'worker:status:';
    public const string REDIS_HEARTBEAT_KEY_PREFIX = 'worker:heartbeat:';

    /**
     * Process types and states
     */
    protected const array PROCESS_TYPES = [
        'MAIN' => 'main',
        'WORKER' => 'worker'
    ];

    /**
     * Current process type
     */
    protected string $processType = self::PROCESS_TYPES['MAIN'];
    
    /**
     * Last heartbeat time
     */
    protected float $lastHeartbeatTime = 0;

    /**
     * Flag indicating that worker is in shutdown mode
     */
    protected bool $isShuttingDown = false;

    /**
     * Initialize Redis-based worker with heartbeat management
     *
     * @throws RuntimeException If Redis initialization fails
     */
    public function __construct()
    {
        try {
            parent::__construct();
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
     * Handle signals for graceful shutdown
     */
    protected function handleSignals(): void
    {
        pcntl_signal(SIGUSR1, function ($signal) {
            try {
                switch($this->processType) {
                    case self::PROCESS_TYPES['MAIN']:
                        // Main process - mark for shutdown but let child processes finish current jobs
                        $this->setWorkerState(self::STATE_STOPPING);
                        $this->isShuttingDown = true;
                        
                        // Update status to indicate stopping state
                        $this->updateWorkerStatus();
                        
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Main process received shutdown signal, current jobs will finish before exit",
                            LOG_NOTICE
                        );
                        break;

                    case self::PROCESS_TYPES['WORKER']:
                        // Worker processes should finish current job and exit
                        $this->isShuttingDown = true;
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Worker process will exit after completing current job",
                            LOG_DEBUG
                        );
                        break;
                }

            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Error during shutdown signal handling: " . $e->getMessage(),
                    LOG_ERR
                );
            }
        });
        
        pcntl_signal(SIGTERM, function ($signal) {
            // Immediate termination
            $this->cleanupRedisKeys();
            exit(0);
        });

        pcntl_signal_dispatch();
    }

    /**
     * Clean up Redis keys on shutdown
     */
    protected function cleanupRedisKeys(): void
    {
        try {
            $keys = [
                self::REDIS_STATUS_KEY_PREFIX . static::class,
                self::REDIS_HEARTBEAT_KEY_PREFIX . static::class
            ];
            foreach ($keys as $key) {
                $this->redis->del($key);
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
     * Update worker status in Redis
     */
    protected function updateWorkerStatus(): void
    {
        try {
            $this->redis = $this->di->get('redis');
            
            $status = [
                'pid' => getmypid(),
                'class' => static::class,
                'state' => $this->workerState,
                'start_time' => $this->workerStartTime,
                'updated_at' => microtime(true),
                'memory_usage' => memory_get_usage(true),
                'shutting_down' => $this->isShuttingDown
            ];

            $statusKey = self::REDIS_STATUS_KEY_PREFIX . static::class;
            $heartbeatKey = self::REDIS_HEARTBEAT_KEY_PREFIX . static::class;

            // Set status and heartbeat with TTL
            $this->redis->setex($statusKey, self::REDIS_STATUS_TTL, json_encode($status));
            $this->redis->setex($heartbeatKey, self::REDIS_HEARTBEAT_TTL, (string)time());
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
        $this->isShuttingDown = true;
        
        // Update status before exiting
        $this->updateWorkerStatus();
        
        // Clean up Redis keys
        $this->cleanupRedisKeys();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Worker gracefully shutting down",
            LOG_NOTICE
        );

        exit(0);
    }

    /**
     * Safely handle Redis connections after fork
     */
    protected function setForked(): void
    {
        parent::setForked();
        $this->updateWorkerStatus();
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
    
    /**
     * Check if worker is in shutdown mode and should exit after current job
     */
    protected function shouldExit(): bool
    {
        return $this->isShuttingDown;
    }
}
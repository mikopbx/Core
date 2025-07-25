<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\Pool\WorkerPoolManager;
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
    protected const int MAX_MEMORY_PERCENT = 80;
    protected const int HEALTH_UPDATE_INTERVAL = 60;

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
     * Last health check time
     */
    protected int $lastHealthCheck = 0;
    
    /**
     * Worker pool manager instance
     *
     * @var WorkerPoolManager|null
     */
    protected ?WorkerPoolManager $poolManager = null;
    
    /**
     * Worker key in the pool
     *
     * @var string|null
     */
    protected ?string $workerKey = null;

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
            
            // Register in pool if maxProc > 1
            if ($this->maxProc > 1) {
                $this->registerInPool();
            }
            
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
            $currentTime = microtime(true);
            $memoryUsage = memory_get_usage(true);
            
            // Perform health check if needed
            $this->performHealthCheck($memoryUsage, $currentTime);
            
            $status = [
                'pid' => getmypid(),
                'class' => static::class,
                'state' => $this->workerState,
                'start_time' => $this->workerStartTime,
                'updated_at' => $currentTime,
                'memory_usage' => $memoryUsage,
                'shutting_down' => $this->isShuttingDown,
                'uptime' => round($currentTime - $this->workerStartTime, 1),
                'instance_id' => $this->instanceId ?? 1
            ];

            $statusKey = self::REDIS_STATUS_KEY_PREFIX . static::class;
            $heartbeatKey = self::REDIS_HEARTBEAT_KEY_PREFIX . static::class;

            // Set status and heartbeat with TTL
            $this->redis->setex($statusKey, self::REDIS_STATUS_TTL, json_encode($status));
            $this->redis->setex($heartbeatKey, self::REDIS_HEARTBEAT_TTL, (string)time());
            
            // Update pool heartbeat if in pool
            if ($this->maxProc > 1) {
                $this->updatePoolHeartbeat();
            }
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
        
        // Unregister from pool if needed
        if ($this->maxProc > 1) {
            $this->unregisterFromPool();
        }
        
        SystemMessages::sysLogMsg(
            static::class,
            "Worker gracefully shutting down",
            LOG_NOTICE
        );

        exit(0);
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
    
    /**
     * Register worker in the pool
     *
     * @return void
     */
    protected function registerInPool(): void
    {
        try {
            $this->poolManager = new WorkerPoolManager();
            $this->workerKey = $this->poolManager->registerWorker(
                static::class,
                getmypid(),
                $this->instanceId
            );
            
            SystemMessages::sysLogMsg(
                static::class,
                sprintf("Worker registered in pool: instance %d, PID %d", $this->instanceId, getmypid()),
                LOG_INFO
            );
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to register in pool: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Unregister worker from the pool
     *
     * @return void
     */
    protected function unregisterFromPool(): void
    {
        try {
            if ($this->poolManager !== null) {
                $this->poolManager->unregisterWorker(static::class, getmypid());
                
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf("Worker unregistered from pool: PID %d", getmypid()),
                    LOG_INFO
                );
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to unregister from pool: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Update worker heartbeat in the pool
     *
     * @return void
     */
    protected function updatePoolHeartbeat(): void
    {
        try {
            if ($this->poolManager !== null) {
                $this->poolManager->updateHeartbeat(static::class, getmypid());
            }
        } catch (Throwable $e) {
            // Silently ignore heartbeat errors to avoid log spam
        }
    }
    
    /**
     * Perform health check during status update
     */
    protected function performHealthCheck(int $memoryUsage, float $currentTime): void
    {
        $currentTimeInt = (int) $currentTime;
        
        if ($currentTimeInt - $this->lastHealthCheck < self::HEALTH_UPDATE_INTERVAL) {
            return;
        }
        
        $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
        $memoryPercent = ($memoryUsage / $memoryLimit) * 100;
        
        // Check if memory usage is too high
        if ($memoryPercent > self::MAX_MEMORY_PERCENT) {
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "High memory usage detected: %.1f%% (%.2f MB / %.2f MB), requesting restart",
                    $memoryPercent,
                    $memoryUsage / 1024 / 1024,
                    $memoryLimit / 1024 / 1024
                ),
                LOG_WARNING
            );
            $this->needRestart = true;
        }
        
        $this->lastHealthCheck = $currentTimeInt;
    }
    
    
    /**
     * Parse memory limit string to bytes
     */
    protected function parseMemoryLimit(string $limit): int
    {
        $unit = strtolower(substr($limit, -1));
        $value = (int) $limit;
        
        switch ($unit) {
            case 'g':
                $value *= 1024 * 1024 * 1024;
                break;
            case 'm':
                $value *= 1024 * 1024;
                break;
            case 'k':
                $value *= 1024;
                break;
        }
        
        return $value;
    }
    
    /**
     * Clean up on destruction
     */
    public function __destruct()
    {
        parent::__destruct();
        
        if ($this->maxProc > 1) {
            $this->unregisterFromPool();
        }
    }
}
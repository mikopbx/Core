<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Processes;
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
    protected ?Redis $pubSubRedis = null;

    /**
     * Child process PIDs
     */
    protected ?int $heartbeatPid = null;
    protected ?int $subscriberPid = null;

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

            // Then start processes
            $this->startHeartbeatProcess();
            $this->startSubscriberProcess();

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

        $this->managementRedis = RedisClientProvider::getWorkerManagementConnection($this->di);
        $this->pubSubRedis = RedisClientProvider::getPubSubConnection($this->di);

        if ($this->managementRedis === null || $this->pubSubRedis === null) {
            throw new RuntimeException('Failed to initialize Redis connections');
        }

        $this->updateWorkerStatus();
    }

    /**
     * Start heartbeat process to monitor worker health
     */
    protected function startHeartbeatProcess(): void
    {
        $pid = pcntl_fork();

        if ($pid === -1) {
            throw new RuntimeException('Failed to fork heartbeat process');
        }

        if ($pid === 0) {
            // Child process
            try {
                $this->setForked();
                cli_set_process_title(static::class . '_heartbeat');
                $this->setProcessType(self::PROCESS_TYPES['HEARTBEAT']);
                $this->runHeartbeat();
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                exit(1);
            }
        }

        $this->heartbeatPid = $pid;
    }

    /**
     * Run the heartbeat loop
     */
    protected function runHeartbeat(): void
    {
        while (true) {
            try {
                // Check parent first
                if (!$this->checkParentProcess()) {
                    SystemMessages::sysLogMsg(static::class, "Parent process not responding", LOG_WARNING);
                    exit(1);
                }
                $this->updateWorkerStatus();
                sleep(self::REDIS_HEARTBEAT_INTERVAL);
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Heartbeat error: " . $e->getMessage(),
                    LOG_WARNING
                );
                sleep(self::REDIS_RECONNECT_INTERVAL);
            }
        }
    }

    /**
     * Check if parent process is still alive
     */
    protected function checkParentProcess(): bool
    {
        $ppid = posix_getppid();
        if ($ppid === 1) {
            return false;
        }
        return posix_kill($ppid, 0);
    }

    /**
     * Start subscriber process for Redis pub/sub messages
     */
    protected function startSubscriberProcess(): void
    {
        $pid = pcntl_fork();

        if ($pid === -1) {
            throw new RuntimeException('Failed to fork subscriber process');
        }

        if ($pid === 0) {
            // Child process
            try {
                $this->setForked();
                cli_set_process_title(static::class . '_subscriber');
                $this->setProcessType(self::PROCESS_TYPES['SUBSCRIBER']);
                $this->runSubscriber();
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                exit(1);
            }
        }

        $this->subscriberPid = $pid;
    }

protected function runSubscriber(): void
{
    while (true) {
        try {
            // Check parent first
            if (!$this->checkParentProcess()) {
                SystemMessages::sysLogMsg(static::class, "Parent process not responding", LOG_WARNING);
                exit(1);
            }

            $redis = RedisClientProvider::getPubSubConnection($this->di);
            if ($redis === null) {
                throw new RuntimeException('Failed to create Redis connection');
            }

            $channels = [
                self::REDIS_COMMAND_CHANNEL_PREFIX . static::class  // Only subscribe to commands
            ];

            $redis->subscribe($channels, [$this, 'handleRedisMessage']);

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Subscriber error (if once it is ok!), will retry: " . $e->getMessage(),
                LOG_DEBUG
            );
            sleep(self::REDIS_RECONNECT_INTERVAL); // Wait before retry
        }
    }
}

    /**
     * Handle incoming Redis messages
     *
     * @param Redis  $redis   Redis instance
     * @param string $channel Channel name
     * @param string $message Message content
     */
    public function handleRedisMessage(Redis $redis, string $channel, string $message): void
    {
        try {
            $data = json_decode($message, true, 512, JSON_THROW_ON_ERROR);

            if (str_starts_with($channel, self::REDIS_COMMAND_CHANNEL_PREFIX)) {
                $this->handleCommandMessage($data);
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    protected function handleSignals(): void
    {
        pcntl_signal(SIGUSR1, function ($signal) {
            try {
                switch($this->processType) {
                    case self::PROCESS_TYPES['MAIN']:
                        // Main process - clean shutdown
                        $this->setWorkerState(self::STATE_STOPPING);

                        // First kill subscriber (non-blocking)
                        if ($this->subscriberPid !== null) {
                            posix_kill($this->subscriberPid, SIGTERM);
                        }

                        // Then kill heartbeat (non-blocking)
                        if ($this->heartbeatPid !== null) {
                            posix_kill($this->heartbeatPid, SIGTERM);
                        }

                        // Wait for children to finish
                        pcntl_wait($status);

                        // Clean up Redis keys
                        $this->cleanupRedisKeys();
                        break;

                    case self::PROCESS_TYPES['SUBSCRIBER']:
                    case self::PROCESS_TYPES['HEARTBEAT']:
                        // Child processes - clean exit
                        if ($this->managementRedis) {
                            $this->managementRedis->close();
                        }
                        if ($this->pubSubRedis) {
                            $this->pubSubRedis->close();
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
                'heartbeat_pid' => $this->heartbeatPid,
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

        // Terminate child processes
        foreach ([$this->heartbeatPid, $this->subscriberPid] as $pid) {
            if ($pid !== null && posix_kill($pid, 0)) {
                posix_kill($pid, SIGTERM);
            }
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
        if ($this->pubSubRedis) {
            $this->pubSubRedis->close();
            $this->pubSubRedis = null;
        }

        // Create new connections for forked process
        $this->initializeRedis();
    }
}
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

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Library\Text;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;
use RuntimeException;
use Throwable;

/**
 * Base class for workers.
 * Provides core functionality for process management, signal handling, and worker lifecycle.
 *
 * @package MikoPBX\Core\Workers
 */
abstract class WorkerBase extends Injectable implements WorkerInterface
{
    /**
     * Default restart interval in seconds for worker monitoring
     */
    public const int KEEP_ALLIVE_CHECK_INTERVAL = 60;

    /**
     * Signals that should be handled by the worker
     */
    private const array MANAGED_SIGNALS = [
        SIGUSR1,
        SIGTERM,
        SIGINT
    ];
    /**
     * Worker state constants
     */
    protected const int STATE_STARTING = 1;
    protected const int STATE_RUNNING = 2;
    protected const int STATE_STOPPING = 3;
    protected const int STATE_RESTARTING = 4;

    /**
     * Worker state constants with descriptions
     */
    protected const array WORKER_STATES = [
        self::STATE_STARTING => 'STARTING',
        self::STATE_RUNNING => 'RUNNING',
        self::STATE_STOPPING => 'STOPPING',
        self::STATE_RESTARTING => 'RESTARTING'
    ];

    /**
     * Resource limits
     */
    private const string MEMORY_LIMIT = '256M';
    private const int ERROR_REPORTING_LEVEL = E_ALL;

    /**
     * Log message format constants
     */
    private const string LOG_FORMAT_STATE = '[%s][%s][%s] %s (%.3fs, PID:%d, Parent:%d)';
    private const string LOG_FORMAT_SIGNAL = '[%s][%s][%s] Signal %s received from %s (%.3fs, PID:%d, Parent:%d)';
    private const string LOG_FORMAT_NORMAL_SHUTDOWN = '[%s][%s][RUNNING->SHUTDOWN] Clean exit from %s (%.3fs, PID:%d, Parent:%d)';
    private const string LOG_FORMAT_NORMAL_EXIT = '[%s][%s] Successfully executed (%.3fs, PID:%d, Parent:%d)';
    private const string LOG_FORMAT_ERROR_SHUTDOWN = '[%s][%s][SHUTDOWN-ERROR] %s from %s (%.3fs, PID:%d, Parent:%d)';
    private const string LOG_FORMAT_NORMAL_EXIT_FORK = '[%s][FORK] Successfully executed (%.3fs, PID:%d, PPID:%d)';
    private const string LOG_FORMAT_NORMAL_SHUTDOWN_FORK = '[%s][FORK][RUNNING->SHUTDOWN] Clean exit from %s (%.3fs, PID:%d, PPID:%d)';
    private const string LOG_FORMAT_PING_ERROR = '[%s][%s][PING-ERROR] %s from %s (%.3fs, PID:%d, Parent:%d)';


    protected const string LOG_NAMESPACE_SEPARATOR = '\\';
    /**
     * Process type identifiers
     */
    private const string PROCESS_TYPE_MAIN = 'MAIN';
    private const string PROCESS_TYPE_FORK = 'FORK';

    /**
     * Maximum number of processes that can be created
     *
     * @var int
     */
    public int $maxProc = 1;

    /**
     * Instance identifier for pool workers
     *
     * @var int
     */
    protected int $instanceId = 1;

    /**
     * Instance of the Asterisk Manager
     *
     * @var AsteriskManager
     */
    protected AsteriskManager $am;

    /**
     * Flag indicating whether the worker needs to be restarted
     *
     * @var bool
     */
    protected bool $needRestart = false;

    /**
     * Time the worker started
     *
     * @var float
     */
    protected float $workerStartTime;

    /**
     * Current state of the worker
     *
     * @var int
     */
    protected int $workerState = self::STATE_STARTING;

    /**
     * Flag indicating whether the worker is a forked process
     *
     * @var bool
     */
    private bool $isForked = false;

    /**
     * Parent PID
     *
     * @var int
     */
    private int $parentPid;


    /**
     * Constructs a WorkerBase instance.
     * Initializes signal handlers, sets up resource limits, and saves PID file.
     *
     * @throws RuntimeException|Throwable If critical initialization fails
     */
    public function __construct()
    {
        try {
            // Initialize basic properties first
            $this->workerStartTime = microtime(true);
            $this->parentPid = posix_getppid();
            $this->workerState = self::STATE_STARTING;

            // Parse command line arguments for instance ID
            if (isset($GLOBALS['argv']) && is_array($GLOBALS['argv'])) {
                foreach ($GLOBALS['argv'] as $arg) {
                    if (preg_match('/^--instance-id=(\d+)$/', $arg, $matches)) {
                        $this->instanceId = (int)$matches[1];
                        break;
                    }
                }
            }

            // Set up basic environment
            $this->setResourceLimits();
            $this->initializeSignalHandlers();
            register_shutdown_function([$this, 'shutdownHandler']);

            // Save PID and update status
            $this->savePidFile();

        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw $e;
        }
    }

    /**
     * Get worker-specific check interval in seconds
     * Can be overridden in child classes to set custom interval
     */
    public static function getCheckInterval(): int
    {
        return self::KEEP_ALLIVE_CHECK_INTERVAL;
    }

    /**
     * Sets resource limits for the worker process
     */
    protected function setResourceLimits(): void
    {
        ini_set('memory_limit', self::MEMORY_LIMIT);
        error_reporting(self::ERROR_REPORTING_LEVEL);
        ini_set('display_errors', '1');
        set_time_limit(0);
    }


    /**
     * Initializes signal handlers for the worker
     */
    private function initializeSignalHandlers(): void
    {
        pcntl_async_signals(true);
        foreach (self::MANAGED_SIGNALS as $signal) {
            pcntl_signal($signal, [$this, 'signalHandler'], true);
        }
    }

    /**
     * Updates worker state and logs the change
     */
    protected function setWorkerState(int $state): void
    {
        $oldState = $this->workerState ?? 'UNDEFINED';
        $this->workerState = $state;

        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $timeElapsed = round(microtime(true) - $this->workerStartTime, 3);
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;

        $oldLogStateStr = self::WORKER_STATES[$oldState] ?? 'UNDEFINED';
        $newLogStateStr = self::WORKER_STATES[$state] ?? 'UNDEFINED';
        if ($oldLogStateStr === $newLogStateStr) {
            $logState = $oldLogStateStr;
        } else {
            $logState = "$oldLogStateStr->$newLogStateStr";
        }

        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                self::LOG_FORMAT_STATE,
                $workerName,
                $processType,
                $logState,
                $namespacePath,
                $timeElapsed,
                getmypid(),
                $this->parentPid
            ),
            LOG_DEBUG
        );
    }

    /**
     * Get current worker status
     *
     * @return array Worker status information
     */
    protected function getWorkerStatus(): array
    {
        return [
            'state' => $this->workerState,
            'uptime' => microtime(true) - $this->workerStartTime,
            'memory' => memory_get_usage(true),
            'is_forked' => $this->isForked
        ];
    }

    /**
     * Generate the PID file path for the worker.
     *
     * @return string The path to the PID file.
     */
    public function getPidFile(): string
    {
        if (isset($this->isForked) && $this->isForked === true) {
            $pid = getmypid();
            // For forked processes, include both instance ID and PID
            return Processes::getForkedPidFilePath(static::class, $pid, $this->instanceId);
        }
        
        // For regular processes or pool instances, include instance ID
        return Processes::getPidFilePath(static::class, $this->instanceId);
    }

    /**
     * Save PID to file(s) with error handling
     *
     * @throws RuntimeException If unable to write PID file
     */
    private function savePidFile(): void
    {
        $pid = getmypid();
        if ($pid === false) {
            throw new RuntimeException('Could not get process ID');
        }
        $pidFile = $this->getPidFile();
        Processes::savePidFile($pidFile, $pid);
    }

    /**
     * Starts the worker process
     *
     * @param array $argv Command-line arguments
     * @param bool $setProcName Whether to set process name
     * @return void
     */
    public static function startWorker(array $argv, bool $setProcName = true): void
    {
        $action = $argv[1] ?? '';
        if ($action === 'start') {
            $workerClassname = static::class;

            if ($setProcName) {
                cli_set_process_title($workerClassname);
            }

            try {
                $worker = new $workerClassname();
                $worker->setWorkerState(self::STATE_RUNNING);
                $worker->start($argv);
                $worker->logNormalExit();
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                sleep(1);
            }
        }
    }

    /**
     * Logs normal exit after operation
     */
    private function logNormalExit(): void
    {
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $timeElapsed = round(microtime(true) - $this->workerStartTime, 3);
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;

        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                $this->isForked ? self::LOG_FORMAT_NORMAL_EXIT_FORK : self::LOG_FORMAT_NORMAL_EXIT,
                $workerName,
                $processType,
                $timeElapsed,
                getmypid(),
                $this->parentPid
            ),
            LOG_DEBUG
        );
    }

    /**
     * Handles various signals received by the worker
     *
     * @param int $signal Signal number
     * @return void
     */
    public function signalHandler(int $signal): void
    {
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $timeElapsed = round(microtime(true) - $this->workerStartTime, 3);
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;

        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                self::LOG_FORMAT_SIGNAL,
                $workerName,
                $processType,
                self::WORKER_STATES[$this->workerState] ?? 'UNKNOWN',
                $this->getSignalString($signal),
                $namespacePath,
                $timeElapsed,
                getmypid(),
                $this->parentPid
            ),
            LOG_DEBUG
        );

        switch ($signal) {
            case SIGUSR1:
                $this->setWorkerState(self::STATE_RESTARTING);

                // For child processes, exit cleanly
                if ($this->isForked) {
                    // Redis-based workers should clean up connections
                    if ($this instanceof WorkerRedisBase) {
                        if ($this->redis) {
                            $this->redis->close();
                        }
                    }
                    exit(0);
                }

                // Call handler for graceful shutdown implementation
                $this->handleSignalUsr1();
                break;

            case SIGTERM:
            case SIGINT:
                $this->setWorkerState(self::STATE_STOPPING);

                // Cleanup for Redis-based workers
                if ($this instanceof WorkerRedisBase) {
                    if ($this->redis) {
                        $this->redis->close();
                    }
                }
                exit(0);

            default:
                // Log unhandled signal
                SystemMessages::sysLogMsg(
                    $workerName,
                    sprintf("Unhandled signal received: %d", $signal),
                    LOG_WARNING
                );
        }
    }

    /**
     * Default handler for SIGUSR1 signal
     * Can be overridden in derived classes to implement graceful shutdown
     */
    protected function handleSignalUsr1(): void
    {
        // Default implementation just sets the restart flag
        $this->needRestart = true;
    }

    /**
     *
     * @param int $signal
     * @return string
     */
    protected function getSignalString(int $signal): string
    {
        $signalNames = [
            SIGUSR1 => 'SIGUSR1',
            SIGTERM => 'SIGTERM',
            SIGINT => 'SIGINT'
        ];

        return $signalNames[$signal] ?? "SIG_$signal";
    }

    /**
     * Handles the shutdown event of the worker
     *
     * @return void
     */
    public function shutdownHandler(): void
    {
        $timeElapsedSecs = round(microtime(true) - $this->workerStartTime, 2);
        $processTitle = cli_get_process_title();

        $error = error_get_last();
        if ($error === null) {
            $this->logNormalShutdown($processTitle, $timeElapsedSecs);
        } else {
            $this->logErrorShutdown($processTitle, $timeElapsedSecs, $error);
        }

        $this->cleanupPidFile();
    }

    /**
     * Logs normal shutdown event
     *
     * @param string $processTitle Process title
     * @param float $timeElapsedSecs Time elapsed since start
     */
    private function logNormalShutdown(string $processTitle, float $timeElapsedSecs): void
    {
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;

        SystemMessages::sysLogMsg(
            $processTitle,
            sprintf(
                $this->isForked ? self::LOG_FORMAT_NORMAL_SHUTDOWN_FORK : self::LOG_FORMAT_NORMAL_SHUTDOWN,
                $workerName,
                $processType,
                $namespacePath,
                $timeElapsedSecs,
                getmypid(),
                $this->parentPid
            ),
            LOG_DEBUG
        );
    }

    /**
     * Logs error shutdown event
     *
     * @param string $processTitle Process title
     * @param float $timeElapsedSecs Time elapsed since start
     * @param array $error Error details
     */
    private function logErrorShutdown(string $processTitle, float $timeElapsedSecs, array $error): void
    {
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;
        $errorMessage = $error['message'] ?? 'Unknown error';

        SystemMessages::sysLogMsg(
            $processTitle,
            sprintf(
                self::LOG_FORMAT_ERROR_SHUTDOWN,
                $workerName,
                $processType,
                $errorMessage,
                $namespacePath,
                $timeElapsedSecs,
                getmypid(),
                $this->parentPid
            ),
            LOG_ERR
        );
    }

    /**
     * Safely cleans up PID file during shutdown
     */
    private function cleanupPidFile(): void
    {
        try {
            $pid = getmypid();
            if ($pid === false) {
                return;
            }

            // Determine which PID file to remove
            $pidFile = $this->getPidFile();

            // Only remove the file if it exists and contains our PID
            if (file_exists($pidFile)) {
                $storedPid = file_get_contents($pidFile);
                if ($storedPid === (string)$pid) {
                    unlink($pidFile);
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to cleanup PID file: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }


    /**
     * Handles ping callback to keep connection alive
     *
     * @param BeanstalkClient $message Received message
     * @return void
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        $processType = $this->isForked ? self::PROCESS_TYPE_FORK : self::PROCESS_TYPE_MAIN;
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));
        $timeElapsed = round(microtime(true) - $this->workerStartTime, 3);
        try {
            $message->reply(json_encode($message->getBody() . ':pong', JSON_THROW_ON_ERROR));
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    self::LOG_FORMAT_PING_ERROR,
                    $workerName,
                    $processType,
                    $e->getMessage(),
                    $namespacePath,
                    $timeElapsed,
                    getmypid(),
                    $this->parentPid
                ),
                LOG_WARNING
            );
        }
    }

    /**
     * Replies to a ping request from the worker
     *
     * @param array $parameters Request parameters
     * @return bool True if ping request was processed
     */
    public function replyOnPingRequest(array $parameters): bool
    {
        try {
            $pingTube = $this->makePingTubeName(static::class);
            if ($pingTube === $parameters['UserEvent']) {
                $this->am->UserEvent("{$pingTube}Pong", []);
                return true;
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Ping reply failed: " . $e->getMessage(),
                LOG_WARNING
            );
        }
        return false;
    }

    /**
     * Generates the ping tube name for a worker class
     *
     * @param string $workerClassName Worker class name
     * @return string Generated ping tube name
     */
    public function makePingTubeName(string $workerClassName): string
    {
        return Text::camelize("ping_$workerClassName", '\\');
    }

    /**
     * Sets flag for forked process after pcntl_fork()
     */
    protected function setForked(): void
    {
        $this->isForked = true;
        $this->parentPid = posix_getppid();
        // Reset the worker start time for forked process
        $this->workerStartTime = microtime(true);
    }

    /**
     * Destructor - ensures PID file is saved on object destruction
     */
    public function __destruct()
    {
        try {
            if ($this->workerState !== self::STATE_STOPPING) {
                $this->savePidFile();
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Destructor failed: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
}
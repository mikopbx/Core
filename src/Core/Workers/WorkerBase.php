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
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
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
    private const string LOG_FORMAT_PING_ERROR = '[%s][%s][PING-ERROR] %s from %s (%.3fs, PID:%d, Parent:%d)';


    protected const string LOG_NAMESPACE_SEPARATOR = '\\';

    /**
     * Redis key prefix for module crash tracking counters.
     * Full key: module:crashes:{ModuleUniqueID} (INCR counter with 30-min EXPIRE)
     */
    public const string REDIS_CRASH_KEY_PREFIX = 'module:crashes:';

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
     * Redis client held by this worker. Can be a raw phpredis \Redis (from
     * RedisClientProvider) or a Phalcon cache wrapper (from
     * ManagedCacheProvider) depending on the subclass. Declared explicitly
     * to avoid the PHP 8.2+ dynamic-property deprecation AND to stop
     * Phalcon\Di\Injectable::__get() from silently resurrecting a fresh
     * connection inside destructors or signal handlers — a real hazard
     * raised in the #1022 code review.
     */
    protected mixed $redis = null;



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
     * Run a Redis operation with a short exponential backoff retry loop.
     *
     * Used to survive transient Redis glitches without dropping in-flight
     * jobs. The backoff is intentionally short (100 ms / 200 ms / 400 ms)
     * so the BLPOP main loop does not block for more than ~1 s total —
     * if Redis is down for longer, the outer main-loop catch handles the
     * extended outage with a larger backoff and a single syslog marker
     * (`reason=redis_unreachable_extended`) instead of spamming Sentry.
     *
     * Phalcon Storage\Adapter\Redis reconnects automatically through its
     * `checkConnect()` on every operation, so we only need to retry and
     * wait; there is no need to tear down the shared adapter here.
     *
     * Introduced for issue #1022.
     *
     * @template T
     * @param callable(): T $op          Redis operation to execute.
     * @param int           $maxAttempts Attempts including the first try.
     * @return T
     * @throws \RedisException|\Phalcon\Storage\Exception on terminal failure
     * @throws \InvalidArgumentException when $maxAttempts is < 1
     */
    protected function withRedisRetry(callable $op, int $maxAttempts = 3): mixed
    {
        if ($maxAttempts < 1) {
            throw new \InvalidArgumentException(
                'withRedisRetry: $maxAttempts must be >= 1, got ' . $maxAttempts
            );
        }
        $lastException = null;
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                return $op();
            } catch (\RedisException | \Phalcon\Storage\Exception $e) {
                $lastException = $e;
                if ($attempt === $maxAttempts) {
                    break;
                }
                // 100 ms, 200 ms, 400 ms — geometric, capped at 2 s total.
                // The shift is clamped to prevent integer overflow when a
                // subclass passes a pathologically large $maxAttempts.
                $shift = min($attempt - 1, 20);
                usleep(min((1 << $shift) * 100_000, 2_000_000));
            }
        }
        throw $lastException;
    }

    /**
     * Best-effort close of the phpredis socket held by this worker.
     *
     * Hoisted here (instead of WorkerRedisBase) so that every subclass —
     * Beanstalk workers that touch ManagedCacheProvider, Redis-pool
     * workers, and shutdown signal handlers — can release their socket
     * without duplicating the wrapper-vs-raw detection logic.
     *
     * Safe to call multiple times and to call when Redis is unreachable:
     * any error is swallowed so the shutdown path never blocks.
     * Introduced for issue #1022 — prevents the "200+ stale Redis
     * connections from terminated PHP workers" pattern documented in
     * commit e2e191abb.
     */
    protected function closeRedis(): void
    {
        try {
            if (isset($this->redis) && is_object($this->redis)) {
                if (method_exists($this->redis, 'close')) {
                    // phpredis \Redis::close() — hard close the socket.
                    @$this->redis->close();
                } elseif (method_exists($this->redis, 'getAdapter')) {
                    // Phalcon cache wrapper — reach through to phpredis.
                    $inner = $this->redis->getAdapter();
                    if (is_object($inner) && method_exists($inner, 'close')) {
                        @$inner->close();
                    }
                }
            }
        } catch (Throwable) {
            // Ignore — the whole point of this method is to release the
            // socket on the way out, not to surface errors.
        }
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
        // Eagerly resolve every class reachable from the signal-handler chain
        // BEFORE pcntl_async_signals(true) lets a signal interrupt the script
        // mid-opcode. Otherwise a SIGTERM landing while Composer's autoloader
        // is in the middle of resolving an unrelated class can re-enter the
        // autoloader and surface as `Class "MikoPBX\\Core\\System\\SystemMessages"
        // not found` (Sentry MIKOPBX-MGF, issue #1052) — the worker then
        // exits without releasing its Redis socket or PID file, feeding the
        // socket-churn pattern from #1022 and the orphan-PID pattern from #1051.
        $this->preloadSignalHandlerDependencies();

        pcntl_async_signals(true);
        foreach (self::MANAGED_SIGNALS as $signal) {
            pcntl_signal($signal, [$this, 'signalHandler'], true);
        }
    }

    /**
     * Force the autoloader to resolve every class reachable from
     * signalHandler() and its callees, so the handler never has to
     * autoload while running inside an async signal context.
     *
     * `class_exists($name, true)` is idempotent and cheap once the class
     * is loaded; calling it from `__construct` keeps signal-time work
     * limited to already-resolved opcodes.
     *
     * Issue #1052.
     */
    private function preloadSignalHandlerDependencies(): void
    {
        // Classes statically referenced from the signal-time call graph:
        //   signalHandler() → dispatchSignal() → setWorkerState()  → SystemMessages::sysLogMsg
        //                                                            → LoggerProvider::SERVICE_NAME
        //                                       → handleSignalUsr1() (subclass-overridable)
        //                                       → closeRedis()
        //                   → exit() → shutdown function: shutdownHandler()
        //                                       → cleanupPidFile() → Processes::removePidFile
        //                                       → getPidFile()     → Processes::getPidFilePath
        //                                                            → Util::mwMkdir
        //
        // LoggerProvider is the subtle one: SystemMessages::sysLogMsg
        // accesses LoggerProvider::SERVICE_NAME which triggers autoload
        // of the provider class. Today RegisterDIServices::init() loads
        // it before WorkerBase::__construct runs, so the original Sentry
        // MGF stack named SystemMessages — but any future bootstrap
        // reorder would push the same race onto LoggerProvider. List it
        // explicitly so we don't silently depend on Globals.php ordering.
        //
        // Excluded by design:
        //   - Phalcon\Di\Di / Injectable: shipped from the C extension,
        //     class_exists() never autoloads a C-extension class.
        //   - CriticalErrorsHandler: only used by __construct / startWorker,
        //     both run before pcntl_async_signals() is enabled.
        //   - BeanstalkClient, Text: only reachable via pingCallBack /
        //     makePingTubeName, never from the signal handler.
        //   - RedisClientProvider: referenced by recordModuleCrash (not
        //     signal-time) and by DI services already loaded at boot.
        $signalHandlerChain = [
            SystemMessages::class,
            LoggerProvider::class,
            Processes::class,
            Util::class,
        ];
        foreach ($signalHandlerChain as $cls) {
            class_exists($cls, true);
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
                'MAIN',
                $logState,
                $namespacePath,
                $timeElapsed,
                getmypid(),
                posix_getppid()
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
            'memory' => memory_get_usage(true)
        ];
    }

    /**
     * Generate the PID file path for the worker.
     *
     * @return string The path to the PID file.
     */
    public function getPidFile(): string
    {
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
                self::recordModuleCrash($workerClassname, $e->getMessage());
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

        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                self::LOG_FORMAT_NORMAL_EXIT,
                $workerName,
                'MAIN',
                $timeElapsed,
                getmypid(),
                posix_getppid()
            ),
            LOG_DEBUG
        );
    }

    /**
     * Handles various signals received by the worker
     *
     * Wrapped in a try/Throwable with a stdlib-only fallback because
     * `pcntl_async_signals(true)` can deliver a signal while the
     * autoloader is busy resolving another class. Even with the
     * preload in {@see preloadSignalHandlerDependencies()}, a future
     * helper call from a subclass might trigger a fresh autoload —
     * we must never let that abort the shutdown path. Issue #1052.
     *
     * @param int $signal Signal number
     * @return void
     */
    public function signalHandler(int $signal): void
    {
        try {
            $this->dispatchSignal($signal);
        } catch (Throwable $e) {
            // stdlib-only fallback: openlog/syslog never autoloads.
            // Don't rethrow — the worker is on its way out and the
            // supervisor will respawn it; surfacing this as a fatal
            // would only spam Sentry with the same race.
            @openlog('mikopbx-worker', LOG_PID, LOG_DAEMON);
            @syslog(
                LOG_WARNING,
                sprintf(
                    'WorkerBase::signalHandler crashed (%s, sig=%d): %s',
                    static::class,
                    $signal,
                    $e->getMessage()
                )
            );
            @closelog();

            if ($signal === SIGTERM || $signal === SIGINT) {
                // Best-effort: free the socket even if logging blew up,
                // then exit so the supervisor can respawn cleanly.
                try {
                    $this->closeRedis();
                } catch (Throwable) {
                    // Already in defensive shutdown — swallow.
                }
                exit(1);
            }

            if ($signal === SIGUSR1) {
                // Preserve the SIGUSR1 contract even when dispatch fails:
                // the supervisor expects a graceful restart on the next
                // main-loop tick, so flip the flag the inner dispatch
                // would have flipped via handleSignalUsr1(). Without this,
                // a mid-autoload race would silently swallow the restart
                // request and the worker would keep running with stale
                // state. Issue #1052 review.
                $this->needRestart = true;
            }
        }
    }

    /**
     * Inner body of the signal handler, kept separate so the outer
     * {@see signalHandler()} wrapper can guarantee a stdlib-only
     * fallback on any Throwable. Issue #1052.
     */
    private function dispatchSignal(int $signal): void
    {
        $workerName = basename(str_replace(self::LOG_NAMESPACE_SEPARATOR, '/', static::class));
        $timeElapsed = round(microtime(true) - $this->workerStartTime, 3);
        $namespacePath = implode('.', array_slice(explode(self::LOG_NAMESPACE_SEPARATOR, static::class), 0, -1));

        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                self::LOG_FORMAT_SIGNAL,
                $workerName,
                'MAIN',
                self::WORKER_STATES[$this->workerState] ?? 'UNKNOWN',
                $this->getSignalString($signal),
                $namespacePath,
                $timeElapsed,
                getmypid(),
                posix_getppid()
            ),
            LOG_DEBUG
        );

        switch ($signal) {
            case SIGUSR1:
                $this->setWorkerState(self::STATE_RESTARTING);


                // Call handler for graceful shutdown implementation
                $this->handleSignalUsr1();
                break;

            case SIGTERM:
            case SIGINT:
                $this->setWorkerState(self::STATE_STOPPING);

                // Release the Redis socket via the wrapper-aware helper
                // (the raw `$this->redis->close()` path would bomb on a
                // Phalcon cache wrapper now that providers can return one —
                // see issue #1022 code review BLOCKER).
                $this->closeRedis();
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

        SystemMessages::sysLogMsg(
            $processTitle,
            sprintf(
                self::LOG_FORMAT_NORMAL_SHUTDOWN,
                $workerName,
                'MAIN',
                $namespacePath,
                $timeElapsedSecs,
                getmypid(),
                posix_getppid()
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
        $errorMessage = $error['message'] ?? 'Unknown error';

        SystemMessages::sysLogMsg(
            $processTitle,
            sprintf(
                self::LOG_FORMAT_ERROR_SHUTDOWN,
                $workerName,
                'MAIN',
                $errorMessage,
                $namespacePath,
                $timeElapsedSecs,
                getmypid(),
                posix_getppid()
            ),
            LOG_ERR
        );
    }

    /**
     * Safely cleans up PID file during shutdown
     */
    private function cleanupPidFile(): void
    {
        $pid = getmypid();
        if ($pid === false) {
            return;
        }

        $pidFile = $this->getPidFile();
        Processes::removePidFile($pidFile, $pid);
    }


    /**
     * Handles ping callback to keep connection alive
     *
     * @param BeanstalkClient $message Received message
     * @return void
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
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
                    'MAIN',
                    $e->getMessage(),
                    $namespacePath,
                    $timeElapsed,
                    getmypid(),
                    posix_getppid()
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
     * Extracts the module unique ID from a worker class name.
     * Module workers follow the namespace pattern: Modules\{ModuleUniqueID}\bin\{WorkerName}
     * Core workers start with MikoPBX\ and are excluded.
     *
     * @param string $workerClassName Fully qualified worker class name
     * @return string|null Module unique ID, or null if this is a core worker
     */
    public static function getModuleIdFromClassName(string $workerClassName): ?string
    {
        $parts = explode('\\', $workerClassName);
        if ($parts[0] === 'Modules' && isset($parts[1])) {
            return $parts[1];
        }
        return null;
    }

    /**
     * Records a module worker crash in Redis for crash-loop detection.
     * Only records crashes for module workers (not core workers).
     * Uses INCR with EXPIRE for a simple crash counter with 30-minute TTL.
     *
     * @param string $workerClassName Fully qualified worker class name
     * @param string $errorMessage The exception/error message (stored for diagnostics)
     */
    public static function recordModuleCrash(string $workerClassName, string $errorMessage): void
    {
        $moduleId = self::getModuleIdFromClassName($workerClassName);
        if ($moduleId === null) {
            return;
        }

        try {
            $di = Di::getDefault();
            if ($di === null) {
                return;
            }
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            $key = self::REDIS_CRASH_KEY_PREFIX . $moduleId;

            // Increment crash counter; EXPIRE resets the 30-minute window on each crash
            $redis->incr($key);
            $redis->expire($key, 1800);

            // Store last error message for diagnostics (separate key, same TTL)
            $msgKey = $key . ':last_error';
            $redis->set($msgKey, mb_substr($errorMessage, 0, 500), ['ex' => 1800]);
        } catch (Throwable) {
            // Silently ignore Redis errors — crash recording is best-effort
        }
    }

    /**
     * Destructor - cleanup on object destruction
     */
    public function __destruct()
    {
        // Only cleanup PID file if we're stopping
        if ($this->workerState === self::STATE_STOPPING) {
            $this->cleanupPidFile();
        }
    }
}
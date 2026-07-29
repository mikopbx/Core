<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers\Cron;

require_once 'Globals.php';

use Fiber;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\System;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\{BeanstalkClient, PBX, Processes, SystemMessages, Util};
use MikoPBX\Core\Workers\Pool\WorkerPoolManager;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerBeanstalkdTidyUp;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerDhcpv6Renewal;
use MikoPBX\Core\Workers\WorkerLogRotate;
use MikoPBX\Core\Workers\WorkerMarketplaceChecker;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyAdministrator;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Core\Workers\WorkerStatusMonitor;
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Core\Workers\WorkerS3Upload;
use MikoPBX\Core\Workers\WorkerS3CacheCleaner;
use MikoPBX\Core\Workers\WorkerSipDnsResolver;
use MikoPBX\Core\Workers\WorkerSoundFilesInit;
use MikoPBX\Core\Workers\WorkerWav2Webm;
use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Modules\Config\SystemConfigInterface;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\Modules\Supervision\StaleOperationReaper;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use RuntimeException;
use Throwable;

/**
 * Class WorkerSafeScriptsCore
 *
 * Represents the core worker for safe scripts.
 * Implements Singleton pattern for continuous process monitoring.
 *
 * @package MikoPBX\Core\Workers\Cron
 */
class WorkerSafeScriptsCore extends WorkerBase
{
    // Constants to denote the methods of checking workers' statuses.
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';
    public const CHECK_BY_AMI = 'checkWorkerAMI';
    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';
    public const CHECK_BY_REDIS = 'checkWorkerRedis';

    /**
     * Maximum allowed time for a single monitoring cycle in seconds.
     * If executeParallel() blocks on I/O longer than this, the process exits
     * and monit/cron restarts a fresh instance.
     */
    private const int WATCHDOG_TIMEOUT_SEC = 120;

    /**
     * Maximum consecutive ping failures before stopping restart attempts.
     * With 5-second monitoring cycles, 12 attempts = ~60 seconds for a worker to start.
     */
    private const int MAX_PING_FAILURES = 12;

    /**
     * Crash count threshold for auto-disabling a module.
     * If a module worker crashes this many times within 30 minutes, the module is disabled.
     * The 30-minute window is enforced by Redis EXPIRE in WorkerBase::recordModuleCrash().
     */
    private const int CRASH_LOOP_THRESHOLD = 100;

    /**
     * Crash count threshold for suppressing core-worker respawns.
     * Half of the module threshold because we cannot *disable* a
     * core worker on breach — we can only stop spawning it for the
     * remainder of the 30-minute Redis TTL. Lower threshold = the
     * Sentry-event storm gets capped sooner. Issue #1051.
     */
    private const int CORE_CRASH_LOOP_THRESHOLD = 50;

    /**
     * Interval (seconds) between consecutive core-worker crash-loop
     * syslog warnings per worker class. Without this, a sustained
     * crash loop would emit one ALERT per monitoring cycle. Issue #1051.
     */
    private const int CORE_CRASH_LOG_INTERVAL_SEC = 300;

    /**
     * Interval (seconds) between forced PID-dir cleanup passes when
     * disk is in `warning` state. The normal cleanup path runs inside
     * {@see Processes::processPHPWorker()}, which the supervisor
     * skips during disk pressure — so without a separate periodic
     * sweep, accumulated `*.pid.tmp.*` orphans from before the fix
     * was deployed (or from the brief race window before
     * disk-watchdog kicked in) would persist forever. Issue #1051.
     */
    private const int DISK_WARNING_CLEANUP_INTERVAL_SEC = 60;

    /**
     * Memory thresholds for system memory watchdog (percentage of MemTotal).
     * WARNING: stop spawning new workers, only monitor existing.
     * EMERGENCY: kill the fattest PHP process to free memory.
     */
    private const int MEMORY_WARNING_PERCENT = 15;
    private const int MEMORY_EMERGENCY_PERCENT = 5;

    /**
     * Minimum free space (bytes) on the PID-file filesystem before
     * the supervisor switches to `disk_warning` and stops spawning
     * new workers. /var/run is normally a small tmpfs, so this
     * threshold is intentionally low (256 KiB) — anything tighter
     * triggers false positives during normal worker churn.
     * Issue #1051.
     *
     * MUST stay strictly above
     * {@see \MikoPBX\Core\Workers\WorkerBase::PID_DIR_MIN_FREE_BYTES}
     * (currently 64 KiB). The 4× headroom is deliberate: it gives
     * {@see maybeCleanupOnDiskWarning()} a window to reclaim orphan
     * tmp files before the worker-side pre-flight refuses outright.
     */
    private const int DISK_WARNING_FREE_BYTES = 262144;

    // The disk-watchdog path is read from {@see Processes::getLockFileDir()}
    // at runtime so we cannot drift from the producer's literal. The
    // previous local DISK_WATCHDOG_PATH constant was removed when the
    // public getter was added. Issue #1051.

    /**
     * Interval (seconds) between consecutive disk-warning syslog
     * messages. Without this, a sustained ENOSPC condition would
     * generate one syslog line per 5-second monitoring cycle (~17 280
     * lines/day). Issue #1051.
     */
    private const int DISK_WARNING_LOG_INTERVAL_SEC = 300;

    /**
     * RSS threshold in bytes for logging a warning when restarting a worker.
     * Workers consuming more than this are likely leaking memory.
     */
    private const int RSS_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB

    /**
     * Restart throttling: sliding window duration in seconds.
     */
    private const int THROTTLE_WINDOW_SEC = 180; // 3 minutes

    /**
     * Restart throttling: backoff tiers [max_restarts => backoff_seconds].
     * Checked in descending order — first match wins.
     */
    private const array THROTTLE_TIERS = [
        10 => 120,  // >10 restarts in 3 min → wait 120s
        5  => 60,   // >5 restarts in 3 min → wait 60s
        3  => 30,   // >3 restarts in 3 min → wait 30s
    ];

    /**
     * Interval between periodic memory reports (seconds).
     */
    private const int MEMORY_REPORT_INTERVAL = 300; // 5 minutes

    /**
     * Seconds to wait after SIGTERM before sending SIGKILL to excess pool workers.
     */
    private const int POOL_KILL_TIMEOUT_SEC = 30;

    /**
     * Maximum seconds a pool may stay in rollover state (actualCount > targetCount).
     * After this, excess processes are killed to restore exact target count.
     */
    private const int POOL_ROLLOVER_TIMEOUT_SEC = 60;

    /**
     * Processes that must never be killed by emergency memory watchdog.
     */
    private const array EMERGENCY_KILL_WHITELIST = [
        'php-fpm',
        'WorkerSafeScriptsCore',
        'WorkerCdr',
        'WorkerCallEvents',
    ];

    /**
     * Singleton instance
     */
    private static ?self $instance = null;

    /**
     * Last check timestamps for each worker
     * @var array<string, int>
     */
    private array $lastCheckTimes = [];

    /**
     * Consecutive ping failure counts per worker.
     * Reset to 0 on successful ping. Incremented on each failed ping.
     * @var array<string, int>
     */
    private array $pingFailureCounts = [];

    /**
     * Restart history for throttling: workerClass => [timestamp, timestamp, ...]
     * @var array<string, array<int, int>>
     */
    private array $restartHistory = [];

    /**
     * PIDs pending graceful shutdown. If still alive after 30s, force-killed.
     * @var array<int, int> pid => SIGTERM sent timestamp
     */
    private array $pendingKills = [];

    /**
     * Tracks when a pool first entered rollover state (actualCount > targetCount).
     * If rollover persists beyond POOL_ROLLOVER_TIMEOUT_SEC, excess is killed.
     * @var array<string, int> workerClassName => first seen timestamp
     */
    private array $rolloverSince = [];

    /**
     * Timestamp of last periodic memory report.
     */
    private int $lastMemoryReportTime = 0;

    /**
     * Current memory state flag set by getSystemMemoryState().
     * 'normal', 'warning', or 'emergency'.
     */
    private string $memoryState = 'normal';

    /**
     * Current PID-dir disk state flag set by getDiskState().
     * 'normal' or 'warning'. There is no `emergency` tier because
     * the supervisor cannot safely free tmpfs space — that is the
     * job of WorkerLogRotate / the operator. Issue #1051.
     */
    private string $diskState = 'normal';

    /**
     * Timestamp of the last disk-warning syslog message. Used to
     * rate-limit the warning to once per
     * DISK_WARNING_LOG_INTERVAL_SEC. Issue #1051.
     */
    private int $lastDiskWarningTime = 0;

    /**
     * Per-class timestamps of the last core-worker crash-loop
     * warning. Keyed by fully qualified worker class name. Used to
     * rate-limit the ALERT log to once per
     * CORE_CRASH_LOG_INTERVAL_SEC per worker. Issue #1051.
     *
     * @var array<string, int>
     */
    private array $lastCoreCrashWarningTime = [];

    /**
     * Timestamp of the last forced PID-dir cleanup. Used to
     * rate-limit the periodic sweep to once per
     * DISK_WARNING_CLEANUP_INTERVAL_SEC seconds. Issue #1051.
     */
    private int $lastDiskWarningCleanupTime = 0;

    /**
     * Cached meminfo values from current monitoring cycle.
     * Reset at the beginning of each getSystemMemoryState() call.
     * @var array{memTotal: int, memAvailable: int, availablePercent: float}
     */
    private array $cachedMeminfo = ['memTotal' => 0, 'memAvailable' => 0, 'availablePercent' => 0];

    /**
     * Cached S3 enabled state. Refreshed every S3_CHECK_INTERVAL seconds.
     */
    private bool $s3Enabled = false;

    /**
     * Timestamp of last S3 settings check.
     */
    private int $lastS3CheckTime = 0;

    /**
     * Interval between S3 configuration checks (seconds).
     */
    private const int S3_CHECK_INTERVAL = 300; // 5 minutes

    /**
     * Interval between stale module-operation reaping passes.
     */
    private const int MODULE_OPERATIONS_REAP_INTERVAL_SEC = 15;

    /**
     * Timestamp of the last stale module-operation reaping pass.
     */
    private int $lastModuleOperationsReapTime = 0;

    // Redis handle inherited from WorkerBase::$redis (protected mixed, default null).
    // A local override here would break PHP 8.2+ property type covariance —
    // see hotfix for issue #1022 WorkerSafeScriptsCore::$redis regression.

    /**
     * Dedicated AMI connection for worker ping/pong checks.
     * Uses events='user' to receive only UserEvent, avoiding accumulation
     * of high-volume call/system/RTCP events in the socket buffer.
     */
    private ?AsteriskManager $amiPing = null;

    /**
     * Initialize the singleton instance
     * This is called after construction to set up the instance
     */
    private function initialize(): void
    {
        // Any initialization code can go here
    }

    /**
     * Returns a dedicated AMI connection that only subscribes to 'user' events.
     * This prevents accumulation of call/system/RTCP events that would consume RAM
     * on busy PBX systems with many concurrent calls.
     *
     * @return AsteriskManager
     */
    private function getAmiForPing(): AsteriskManager
    {
        if ($this->amiPing !== null && is_resource($this->amiPing->socket)) {
            return $this->amiPing;
        }
        $port = PbxSettings::getValueByKey(PbxSettings::AMI_PORT);
        $this->amiPing = new AsteriskManager();
        $this->amiPing->connect("127.0.0.1:{$port}", null, null, 'user');
        return $this->amiPing;
    }

    /**
     * Handle SIGUSR1 for the supervisor process.
     * SafeScripts has no in-progress work to preserve — just exit immediately.
     * Monit/cron will restart a fresh instance that picks up all workers.
     */
    protected function handleSignalUsr1(): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            "SIGUSR1 received, exiting for restart by process manager",
            LOG_NOTICE
        );
        exit(0);
    }

    /**
     * Watchdog handler — fires when a monitoring cycle exceeds WATCHDOG_TIMEOUT_SEC.
     * This catches Fiber I/O stalls (blocked Beanstalk pings, hung Redis, etc.).
     */
    public function watchdogHandler(): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                "Watchdog timeout (%ds): monitoring cycle stalled on I/O, exiting for restart",
                self::WATCHDOG_TIMEOUT_SEC
            ),
            LOG_WARNING
        );
        exit(1);
    }

    /**
     * Get singleton instance
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
            self::$instance->initialize();
        }
        return self::$instance;
    }

    /**
     * Get check interval for specific worker
     */
    private function getWorkerInterval(string $workerClass): int
    {
        if (class_exists($workerClass) && method_exists($workerClass, 'getCheckInterval')) {
            return $workerClass::getCheckInterval();
        }
        return self::KEEP_ALLIVE_CHECK_INTERVAL;
    }

    /**
     * Check if worker needs to be monitored based on its interval
     */
    private function shouldCheckWorker(string $workerClass): bool
    {
        $currentTime = time();
        $lastCheck = $this->lastCheckTimes[$workerClass] ?? 0;
        $interval = $this->getWorkerInterval($workerClass);
        
        return ($currentTime - $lastCheck) >= $interval;
    }

    /**
     * Update last check time for worker
     */
    private function updateLastCheckTime(string $workerClass): void
    {
        $this->lastCheckTimes[$workerClass] = time();
    }

    /**
     * Returns true when the worker belongs to a module that is currently disabled.
     *
     * Core (MikoPBX\*) workers always return false — getModuleIdFromClassName()
     * yields null for them. For module workers the current state is read through
     * PbxExtensionUtils::isEnabled(), which is backed by the shared Redis cache
     * (DB4); disableModule() invalidates that cache on save (afterSave →
     * ModelsBase::clearCache(PbxExtensionModules)), so the supervisor observes
     * the disabled state on its very next monitoring cycle.
     *
     * @param string $workerClass Fully-qualified worker class name.
     * @return bool
     */
    private function isDisabledModuleWorker(string $workerClass): bool
    {
        $moduleId = self::getModuleIdFromClassName($workerClass);
        if ($moduleId === null) {
            return false;
        }
        try {
            return !PbxExtensionUtils::isEnabled($moduleId);
        } catch (Throwable $e) {
            // A Redis/cache hiccup must not crash the supervisor's main loop
            // (which is not wrapped in try/catch). Degrade to "enabled" so the
            // worker is monitored normally — the worst case is one extra cycle
            // before a disabled module's worker is reaped on the next pass.
            return false;
        }
    }

    /**
     * Executes tasks in parallel using PHP Fibers
     *
     * @param array<callable> $tasks Array of callables to execute
     * @return void
     */
    private function executeParallel(array $tasks): void 
    {
        $fibers = [];
        
        // Create fibers for each task
        foreach ($tasks as $task) {
            $fiber = new Fiber($task);
            $fibers[] = $fiber;
            $fiber->start();
        }
        
        // Resume fibers until all are complete
        while (!empty($fibers)) {
            foreach ($fibers as $index => $fiber) {
                if ($fiber->isTerminated()) {
                    unset($fibers[$index]);
                    continue;
                }
                
                if ($fiber->isSuspended()) {
                    $fiber->resume();
                }
            }
        }
    }

    /**
     * Restarts all registered workers with improved pipeline.
     * Uses parallel processing with Fibers for efficiency.
     *
     * @param bool $softRestart Whether to perform a soft restart (only SIGUSR1, no SIGTERM)
     * @throws Throwable
     */
    public function restart(bool $softRestart = false): void
    {
        // Get all workers that need to be restarted
        $arrWorkers = $this->prepareWorkersList();
        
        // Add WorkerSafeScriptsCore itself to the restart list
        // This ensures it reloads module workers after installation
        $arrWorkers[self::CHECK_BY_PID_NOT_ALERT][] = static::class;
        
        // Log restart mode
        SystemMessages::sysLogMsg(
            static::class,
            $softRestart ? "Starting SOFT restart process (SIGUSR1 only)" : "Starting FULL restart process",
            LOG_NOTICE
        );
        
        // Collect all running workers
        $runningWorkers = [];
        
        // Create tasks for collecting PIDs and initiating restarts
        $pidCollectionTasks = [];
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $pidCollectionTasks[] = function() use ($worker, &$runningWorkers, $softRestart) {
                    $pid = Processes::getPidOfProcess($worker);
                    if (!empty($pid)) {
                        $runningWorkers[$worker] = $pid;
                        
                        // For API workers, prioritize and handle specially
                        $isApiWorker = strpos($worker, 'WorkerApiCommands') !== false;
                        
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf("Restarting worker: %s %s", 
                                $worker, 
                                $isApiWorker ? "(API worker - prioritized)" : ""
                            ),
                            LOG_NOTICE
                        );
                        
                        // Use processPHPWorker with the appropriate action and parameters
                        $action = $softRestart ? 'soft-restart' : 'restart';
                        Processes::processPHPWorker($worker, 'start', $action);
                    }
                    Fiber::suspend();
                };
            }
        }
        
        // Execute PID collection and restart in parallel
        $this->executeParallel($pidCollectionTasks);
        
        SystemMessages::sysLogMsg(
            static::class, 
            $softRestart ? "Worker soft restart completed - existing processes will restart after completing tasks" : 
                "Worker restart completed - new instances are running with updated code", 
            LOG_NOTICE
        );
    }

    /**
     * Prepares the list of workers to start and restart.
     * Collects core and module workers.
     *
     * @return array<string, array<string>> The prepared workers list.
     */
    private function prepareWorkersList(): array
    {
        // Initialize the workers' list.
        // Each worker type corresponds to a list of workers.
        $arrWorkers = [
            self::CHECK_BY_REDIS =>
                [
                    WorkerApiCommands::class,
                    WorkerPrepareAdvice::class,
                    WorkerStatusMonitor::class,
                ],
            self::CHECK_BY_AMI =>
                [
                ],
            self::CHECK_BY_BEANSTALK =>
                [
                    WorkerCdr::class,
                    WorkerCallEvents::class,
                    WorkerModelsEvents::class,
                    WorkerNotifyByEmail::class,
                ],
            self::CHECK_BY_PID_NOT_ALERT =>
                [
                    WorkerSoundFilesInit::class,
                    WorkerMarketplaceChecker::class,
                    WorkerBeanstalkdTidyUp::class,
                    WorkerDhcpv6Renewal::class,
                    WorkerLogRotate::class,
                    WorkerRemoveOldRecords::class,
                    WorkerNotifyAdministrator::class,
                    WorkerSipDnsResolver::class,
                    WorkerWav2Webm::class,
                ],
        ];

        // Add S3 workers only when S3 storage is configured (saves ~100MB RAM otherwise)
        if ($this->isS3Enabled()) {
            $arrWorkers[self::CHECK_BY_PID_NOT_ALERT][] = WorkerS3Upload::class;
            $arrWorkers[self::CHECK_BY_PID_NOT_ALERT][] = WorkerS3CacheCleaner::class;
        }

        // Get the list of module workers. A broken module hook must not break the
        // whole worker list — otherwise one faulty module would drop ALL module
        // workers (and the core list) from supervision. Degrade to no module
        // workers on failure and keep supervising the core workers.
        $arrModulesWorkers = [];
        try {
            $hookedWorkers = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::GET_MODULE_WORKERS);
            $hookedWorkers = array_values($hookedWorkers);
            if (!empty($hookedWorkers)) {
                $arrModulesWorkers = array_merge(...$hookedWorkers);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                'Failed to collect module workers (GET_MODULE_WORKERS hook): ' . $e->getMessage(),
                LOG_ERR
            );
        }

        // If there are module workers, add them to the workers' list.
        if (!empty($arrModulesWorkers)) {
            foreach ($arrModulesWorkers as $moduleWorker) {
                $arrWorkers[$moduleWorker['type']][] = $moduleWorker['worker'];
            }
        }

        // Return the prepared workers' list.
        return $arrWorkers;
    }

    /**
     * Starts all workers and continuously monitors them.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        // Signal handlers are registered automatically in parent constructor.
        // SIGUSR1 calls handleSignalUsr1() which exits immediately.
        // Monit/cron restarts a fresh instance.

        // Register watchdog: if a monitoring cycle stalls on I/O (blocked Fiber),
        // SIGALRM fires and exits the process for restart.
        pcntl_signal(SIGALRM, [$this, 'watchdogHandler']);

        // Wait for the system to fully boot.
        PBX::waitFullyBooted();

        // Main monitoring loop. Runs indefinitely until SIGUSR1/SIGTERM exits the process.
        while (true) {

            // Reset watchdog at the start of each cycle
            pcntl_alarm(self::WATCHDOG_TIMEOUT_SEC);

            // If the system is booting, do not start the workers.
            if (System::isBooting()) {
                sleep(5);
                continue;
            }

            // Check system memory state before processing workers
            $this->getSystemMemoryState();

            // Check PID-dir disk state. When the tmpfs holding
            // /var/run/php-workers fills up, every worker spawn
            // crashes on Processes::savePidFile() with ENOSPC; the
            // pre-flight check in WorkerBase short-circuits silently,
            // but we should also stop *trying* to spawn so the
            // restart-history throttle does not get exhausted on a
            // condition the supervisor cannot fix. Issue #1051.
            $this->getDiskState();

            // Force a PID-dir cleanup pass while we are in disk
            // pressure. The normal cleanup runs inside
            // Processes::processPHPWorker() which the disk-watchdog
            // skips below — without this, accumulated `*.pid.tmp.*`
            // orphans from before the fix was deployed (or from the
            // brief race between supervisor and worker pre-flight)
            // would persist and prevent recovery. Rate-limited to
            // once per DISK_WARNING_CLEANUP_INTERVAL_SEC. Issue #1051.
            $this->maybeCleanupOnDiskWarning();

            // Periodic memory report (every 5 minutes)
            $this->logMemoryReport();

            // Finalize module operations whose orchestrator died (heartbeat
            // stale): fences the zombie out, kills its process group and
            // unfreezes any browser still watching the operation.
            $this->maybeReapModuleOperations();

            // Prepare the list of workers to be started.
            $arrWorkers = $this->prepareWorkersList();

            $tasks = [];
            foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
                foreach ($workersWithCurrentType as $worker) {
                    // A module worker whose module was disabled must never be
                    // monitored or respawned. The pbxConfModules provider is a
                    // per-process shared singleton built at supervisor startup,
                    // so prepareWorkersList() keeps listing a just-disabled
                    // module's workers until this process restarts. Without this
                    // guard the supervisor respawns the workers that
                    // disableModule()'s killByName() just killed, leaving them as
                    // orphans (PPID=1) once the supervisor finally restarts with
                    // a fresh list — reproducibly so when several modules are
                    // disabled in quick succession. Also reap any orphan still
                    // running, so the supervisor self-heals regardless of cause.
                    if ($this->isDisabledModuleWorker($worker)) {
                        if (Processes::getPidOfProcess($worker) !== '') {
                            Processes::killByName($worker);
                            SystemMessages::sysLogMsg(
                                __CLASS__,
                                "Reaped orphaned worker of disabled module: {$worker}",
                                LOG_WARNING
                            );
                        }
                        continue;
                    }

                    if ($this->shouldCheckWorker($worker)) {
                        $tasks[] = match($workerType) {
                            self::CHECK_BY_BEANSTALK => fn() => $this->checkWorkerBeanstalk($worker),
                            self::CHECK_BY_PID_NOT_ALERT => fn() => $this->checkPidNotAlert($worker),
                            self::CHECK_BY_AMI => fn() => $this->checkWorkerAMI($worker),
                            self::CHECK_BY_REDIS => fn() => $this->checkWorkerRedis($worker),
                            default => null,
                        };
                        $this->updateLastCheckTime($worker);
                    }
                }
            }

            // Filter out null tasks and execute
            $tasks = array_filter($tasks);
            if (!empty($tasks)) {
                $this->executeParallel($tasks);
            }

            // Sleep for a short interval before next check
            sleep(5);
        }
    }

    /**
     * Runs the stale module-operation reaper, rate limited to one pass per
     * MODULE_OPERATIONS_REAP_INTERVAL_SEC.
     */
    private function maybeReapModuleOperations(): void
    {
        if (time() - $this->lastModuleOperationsReapTime < self::MODULE_OPERATIONS_REAP_INTERVAL_SEC) {
            return;
        }
        $this->lastModuleOperationsReapTime = time();
        try {
            (new StaleOperationReaper())->reap();
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Module operations reaping failed: ' . $e->getMessage(), LOG_ERR);
        }
    }

    /**
     * Pings a worker to check if it is dead. If it is, it is killed and started again.
     * Uses Beanstalk queue to send ping and check workers.
     *
     * @param string $workerClassName The class name of the worker.
     */
    public function checkWorkerBeanstalk(string $workerClassName): void
    {
        try {
            // Get the number of instances to maintain
            $maxProc = $this->getWorkerInstanceCount($workerClassName);
            
            // Check if we need to manage a pool of workers
            if ($maxProc > 1) {
                $this->checkWorkerPool($workerClassName, $maxProc);
                return;
            }
            
            $start = microtime(true);
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            $result = false;
            if ($WorkerPID !== '') {
                // We had service PID, so we will ping it
                $queue = new BeanstalkClient($this->makePingTubeName($workerClassName));
                // Check service with higher priority
                [$result] = $queue->sendRequest('ping', 5, 1);
            }
            if (false === $result
                && !$this->isModuleInCrashLoop($workerClassName)
                && !$this->isCoreWorkerInCrashLoop($workerClassName)
                && $this->memoryState === 'normal'
                && $this->diskState === 'normal'
                && !$this->shouldThrottleRestart($workerClassName)
            ) {
                $this->logWorkerRssBeforeRestart($workerClassName, $WorkerPID);
                $this->recordRestart($workerClassName);
                Processes::processPHPWorker($workerClassName);
                SystemMessages::sysLogMsg(__METHOD__, "Service {$workerClassName} started.", LOG_NOTICE);
            }
            $timeElapsedSecs = round(microtime(true) - $start, 2);
            if ($timeElapsedSecs > 10) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                    LOG_WARNING
                );
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        Fiber::suspend();
    }

    /**
     * Checks the PID worker and starts it if it died.
     *
     * @param string $workerClassName The class name of the worker.
     */
    public function checkPidNotAlert(string $workerClassName): void
    {
        // Get the number of instances to maintain
        $maxProc = $this->getWorkerInstanceCount($workerClassName);
        
        // Check if we need to manage a pool of workers
        if ($maxProc > 1) {
            $this->checkWorkerPool($workerClassName, $maxProc);
            return;
        }
        
        // Check if the worker is alive based on its PID. If not, restart it.
        $start = microtime(true);
        $WorkerPID = Processes::getPidOfProcess($workerClassName);
        $result = ($WorkerPID !== '');
        if (false === $result
            && !$this->isModuleInCrashLoop($workerClassName)
            && !$this->isCoreWorkerInCrashLoop($workerClassName)
            && $this->memoryState === 'normal'
            && $this->diskState === 'normal'
            && !$this->shouldThrottleRestart($workerClassName)
        ) {
            // PID is empty here (result=false means WorkerPID===''),
            // so no RSS to log — the process already exited.
            $this->recordRestart($workerClassName);
            Processes::processPHPWorker($workerClassName);
        }
        $timeElapsedSecs = round(microtime(true) - $start, 2);
        if ($timeElapsedSecs > 10) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                LOG_WARNING
            );
        }
        Fiber::suspend();
    }

    /**
     * Pings a worker to check if it is dead. If it is, it is killed and started again.
     * Uses AMI UserEvent to send ping and check workers.
     * Non-blocking: uses failure counter instead of recursive retries with sleep.
     * Retries happen naturally across monitoring cycles (every 5 seconds).
     *
     * @param string $workerClassName The class name of the worker.
     */
    public function checkWorkerAMI(string $workerClassName): void
    {
        try {
            // Get the number of instances to maintain
            $maxProc = $this->getWorkerInstanceCount($workerClassName);

            // Check if we need to manage a pool of workers
            if ($maxProc > 1) {
                $this->checkWorkerPool($workerClassName, $maxProc);
                return;
            }

            $start = microtime(true);
            $res_ping = false;
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            if ($WorkerPID !== '') {
                // We have the service PID, so we will ping it.
                // Use dedicated AMI connection with events='user' to avoid
                // accumulating high-volume call/RTCP events in the socket buffer.
                $am = $this->getAmiForPing();
                $res_ping = $am->pingAMIListener($this->makePingTubeName($workerClassName));
            }

            if ($res_ping) {
                // Worker is alive, reset failure counter
                $this->pingFailureCounts[$workerClassName] = 0;
            } else {
                // Worker is dead or not responding
                $failures = ($this->pingFailureCounts[$workerClassName] ?? 0) + 1;
                $this->pingFailureCounts[$workerClassName] = $failures;

                if ($this->isModuleInCrashLoop($workerClassName)) {
                    // Module disabled by crash-loop watchdog — logged inside isModuleInCrashLoop()
                } elseif ($this->isCoreWorkerInCrashLoop($workerClassName)) {
                    // Core worker crash-loop — logged inside isCoreWorkerInCrashLoop() (#1051)
                } elseif ($this->memoryState !== 'normal') {
                    // Skip restart during memory pressure (warning or emergency)
                } elseif ($this->diskState !== 'normal') {
                    // Skip restart during disk pressure — logged inside getDiskState() (#1051)
                } elseif ($this->shouldThrottleRestart($workerClassName)) {
                    // Skip restart due to throttling — logged inside shouldThrottleRestart()
                } elseif ($failures <= self::MAX_PING_FAILURES) {
                    $this->logWorkerRssBeforeRestart($workerClassName, $WorkerPID);
                    $this->recordRestart($workerClassName);
                    Processes::processPHPWorker($workerClassName);
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Service {$workerClassName} started (attempt {$failures}/" . self::MAX_PING_FAILURES . ").",
                        LOG_NOTICE
                    );
                } else {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Service {$workerClassName} failed to respond after " . self::MAX_PING_FAILURES . " attempts.",
                        LOG_ERR
                    );
                }
            }

            $timeElapsedSecs = round(microtime(true) - $start, 2);
            if ($timeElapsedSecs > 10) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                    LOG_WARNING
                );
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        Fiber::suspend();
    }

    /**
     * Check worker status using Redis with enhanced ping-pong mechanism
     *
     * @param string $workerClassName The class name of the worker to check
     * @throws RuntimeException If Redis connection fails
     */
    protected function checkWorkerRedis(string $workerClassName): void
    {
        try {
            // Initialize Redis connection if needed
            if (!isset($this->redis) || !$this->redis) {
                $this->redis = $this->di->get('redis');
            }
            
            // Get the number of instances to maintain
            $maxProc = $this->getWorkerInstanceCount($workerClassName);
            
            // Check if we need to manage a pool of workers
            if ($maxProc > 1) {
                $this->checkWorkerPool($workerClassName, $maxProc);
                return;
            }
            
            // Regular single worker check
            $heartbeatKey = WorkerRedisBase::REDIS_HEARTBEAT_KEY_PREFIX . $workerClassName;

            $lastHeartbeat = $this->redis->get($heartbeatKey);

            if ($lastHeartbeat !== false && (time() - (int)$lastHeartbeat) < 10) {
                return;
            }

            // Check status key instead of using pub/sub
            $statusKey = WorkerRedisBase::REDIS_STATUS_KEY_PREFIX . $workerClassName;
            $status = $this->redis->get($statusKey);

            if ($status !== false) {
                $status = json_decode($status, true);
                if (isset($status['updated_at']) && (microtime(true) - $status['updated_at']) < 10) {
                    return;
                }
            }

            SystemMessages::sysLogMsg(
                static::class,
                "Worker status not found or stale - restarting $workerClassName",
                LOG_WARNING
            );

            if ($this->isModuleInCrashLoop($workerClassName)) {
                return;
            }

            if ($this->isCoreWorkerInCrashLoop($workerClassName)) {
                // Core worker crash-loop — logged inside method (#1051)
                return;
            }

            if ($this->memoryState !== 'normal') {
                return;
            }

            if ($this->diskState !== 'normal') {
                // Disk pressure on PID-file fs — skip spawn (#1051)
                return;
            }

            if ($this->shouldThrottleRestart($workerClassName)) {
                return;
            }

            // Log RSS before restart and record for throttling
            $workerPID = Processes::getPidOfProcess($workerClassName);
            $this->logWorkerRssBeforeRestart($workerClassName, $workerPID);
            $this->recordRestart($workerClassName);

            // Restart the worker
            Processes::processPHPWorker($workerClassName);

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error checking worker: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Get the number of worker instances that should be maintained
     * 
     * @param string $workerClassName The worker class name
     * @return int Number of instances to maintain
     */
    private function getWorkerInstanceCount(string $workerClassName): int
    {
        if (class_exists($workerClassName)) {
            try {
                $reflectionClass = new \ReflectionClass($workerClassName);
                
                // Проверяем есть ли свойство maxProc
                if ($reflectionClass->hasProperty('maxProc')) {
                    $property = $reflectionClass->getProperty('maxProc');
                    
                    // Получаем значение из дефолтных свойств класса
                    $defaultProperties = $reflectionClass->getDefaultProperties();
                    if (isset($defaultProperties['maxProc'])) {
                        $maxProc = (int)$defaultProperties['maxProc'];
                        return $maxProc;
                    }
                }
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Error getting maxProc for $workerClassName: " . $e->getMessage(),
                    LOG_WARNING
                );
            }
        }
        
        // Default to single instance if maxProc can't be determined
        return 1;
    }
    
    /**
     * Checks if a module worker is in a crash loop and disables the module if threshold exceeded.
     * Returns true if the module was disabled (caller should NOT restart the worker).
     * Returns false for core workers or if crash count is below threshold.
     *
     * @param string $workerClassName Fully qualified worker class name
     * @return bool True if module was disabled due to crash loop
     */
    private function isModuleInCrashLoop(string $workerClassName): bool
    {
        $moduleId = WorkerBase::getModuleIdFromClassName($workerClassName);
        if ($moduleId === null) {
            return false;
        }

        try {
            if (!isset($this->redis) || !$this->redis) {
                $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            }

            $key = WorkerBase::REDIS_CRASH_KEY_PREFIX . $moduleId;
            $crashCount = (int)$this->redis->get($key);

            if ($crashCount >= self::CRASH_LOOP_THRESHOLD) {
                // Retrieve last error message for the disable reason
                $lastError = $this->redis->get($key . ':last_error') ?: 'Unknown error';
                $reasonText = "Worker {$workerClassName} crashed {$crashCount} times in 30 minutes. Last error: {$lastError}";

                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Module {$moduleId} disabled: {$reasonText}",
                    LOG_ERR
                );
                $disabled = PbxExtensionUtils::forceDisableModule(
                    $moduleId,
                    PbxExtensionState::DISABLED_BY_CRASH_LOOP,
                    $reasonText
                );

                // Clean up crash data only when the module is confirmed disabled.
                // If the disable could not be persisted (e.g. locked DB), keep the
                // counters so the next tick retries instead of restarting the count
                // from zero (which would let the crashing worker loop indefinitely).
                if ($disabled) {
                    $this->redis->del([$key, $key . ':last_error']);
                }

                // Either way, do not respawn the crashing worker in this cycle.
                return true;
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        return false;
    }

    /**
     * Checks if a core worker is in a crash loop and should be skipped
     * for respawn. Symmetric to {@see isModuleInCrashLoop()} but without
     * the disable side-effect: core workers cannot be turned off, so
     * the supervisor only suppresses the spawn until the 30-minute
     * Redis TTL on the crash counter expires.
     *
     * Returns true when the caller MUST skip the spawn this cycle.
     * Returns false for module workers (handled by isModuleInCrashLoop)
     * and when crash count is below threshold. Issue #1051.
     *
     * Emits a single ALERT-level syslog line per
     * CORE_CRASH_LOG_INTERVAL_SEC per worker class so a sustained
     * crash loop does not flood the log.
     *
     * @param string $workerClassName Fully qualified worker class name
     * @return bool True if respawn should be suppressed
     */
    private function isCoreWorkerInCrashLoop(string $workerClassName): bool
    {
        // Module workers are handled by isModuleInCrashLoop(); this
        // method is only the fallback for core workers.
        if (WorkerBase::getModuleIdFromClassName($workerClassName) !== null) {
            return false;
        }

        try {
            if (!isset($this->redis) || !$this->redis) {
                $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            }

            $key = WorkerBase::REDIS_CORE_CRASH_KEY_PREFIX . $workerClassName;
            $crashCount = (int)$this->redis->get($key);

            if ($crashCount < self::CORE_CRASH_LOOP_THRESHOLD) {
                return false;
            }

            $now = time();
            $lastWarn = $this->lastCoreCrashWarningTime[$workerClassName] ?? 0;
            if (($now - $lastWarn) >= self::CORE_CRASH_LOG_INTERVAL_SEC) {
                $this->lastCoreCrashWarningTime[$workerClassName] = $now;
                $lastError = $this->redis->get($key . ':last_error') ?: 'Unknown error';
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'CORE WORKER CRASH LOOP: %s crashed %d times in 30 minutes — suppressing respawn. Last error: %s',
                        $workerClassName,
                        $crashCount,
                        $lastError
                    ),
                    LOG_ALERT
                );
            }
            return true;
        } catch (Throwable $e) {
            // Best-effort: if Redis is unreachable we cannot determine
            // crash-loop state, so let the in-memory throttle do its
            // job. Don't surface this through Sentry — it would be a
            // second source of noise on top of the original crash.
            SystemMessages::sysLogMsg(
                __METHOD__,
                "isCoreWorkerInCrashLoop check failed: " . $e->getMessage(),
                LOG_DEBUG
            );
            return false;
        }
    }

    /**
     * Checks if S3 storage is configured and enabled.
     * Caches the result for S3_CHECK_INTERVAL seconds to avoid repeated DB reads.
     *
     * @return bool True if S3 is enabled and configured
     */
    private function isS3Enabled(): bool
    {
        $now = time();
        if (($now - $this->lastS3CheckTime) >= self::S3_CHECK_INTERVAL) {
            $this->lastS3CheckTime = $now;
            try {
                $settings = StorageSettings::getSettings();
                $this->s3Enabled = ($settings->s3_enabled === 1 && $settings->isS3Configured());
            } catch (Throwable) {
                $this->s3Enabled = false;
            }
        }
        return $this->s3Enabled;
    }

    /**
     * Reads /proc/meminfo and returns the current system memory state.
     * Updates $this->memoryState ('normal', 'warning', 'emergency').
     *
     * @return string Current memory state
     */
    private function getSystemMemoryState(): string
    {
        $meminfo = @file_get_contents('/proc/meminfo');
        if ($meminfo === false) {
            $this->memoryState = 'normal';
            return $this->memoryState;
        }

        $memTotal = 0;
        $memAvailable = 0;

        if (preg_match('/^MemTotal:\s+(\d+)\s+kB$/m', $meminfo, $m)) {
            $memTotal = (int)$m[1];
        }
        if (preg_match('/^MemAvailable:\s+(\d+)\s+kB$/m', $meminfo, $m)) {
            $memAvailable = (int)$m[1];
        }

        if ($memTotal === 0) {
            $this->memoryState = 'normal';
            return $this->memoryState;
        }

        $availablePercent = ($memAvailable / $memTotal) * 100;

        // Cache for logMemoryReport() to avoid re-reading /proc/meminfo
        $this->cachedMeminfo = [
            'memTotal' => $memTotal,
            'memAvailable' => $memAvailable,
            'availablePercent' => $availablePercent,
        ];

        if ($availablePercent < self::MEMORY_EMERGENCY_PERCENT) {
            $this->memoryState = 'emergency';
            $this->handleMemoryEmergency($memTotal, $memAvailable, $availablePercent);
        } elseif ($availablePercent < self::MEMORY_WARNING_PERCENT) {
            $this->memoryState = 'warning';
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'LOW MEMORY WARNING: available=%.1f%% (%dMB/%dMB) — skipping worker spawns this cycle',
                    $availablePercent,
                    (int)($memAvailable / 1024),
                    (int)($memTotal / 1024)
                ),
                LOG_WARNING
            );
        } else {
            $this->memoryState = 'normal';
        }

        return $this->memoryState;
    }

    /**
     * Reads disk_free_space() on the PID-file directory and updates
     * $this->diskState ('normal' or 'warning'). When in 'warning',
     * worker check methods skip restart attempts so the throttle
     * history does not get exhausted on an ENOSPC condition the
     * supervisor cannot resolve.
     *
     * Logs are rate-limited to one line per
     * DISK_WARNING_LOG_INTERVAL_SEC seconds. Issue #1051.
     *
     * @return string Current disk state
     */
    private function getDiskState(): string
    {
        $watchPath = Processes::getLockFileDir();
        $free = @disk_free_space($watchPath);
        if ($free === false) {
            // statfs() failed (path missing, fs error). Treat as
            // normal — savePidFile() will produce the real error if
            // we actually try to spawn.
            $this->diskState = 'normal';
            return $this->diskState;
        }

        if ($free >= self::DISK_WARNING_FREE_BYTES) {
            $this->diskState = 'normal';
            return $this->diskState;
        }

        $this->diskState = 'warning';
        $now = time();
        if (($now - $this->lastDiskWarningTime) >= self::DISK_WARNING_LOG_INTERVAL_SEC) {
            $this->lastDiskWarningTime = $now;
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'LOW DISK on %s: free=%dB (threshold %dB) — skipping worker spawns until disk is freed',
                    $watchPath,
                    (int)$free,
                    self::DISK_WARNING_FREE_BYTES
                ),
                LOG_WARNING
            );
        }
        return $this->diskState;
    }

    /**
     * Forces a PID-dir cleanup pass during disk-pressure cycles.
     * Rate-limited to once per DISK_WARNING_CLEANUP_INTERVAL_SEC so
     * the supervisor does not glob the directory every 5-second
     * cycle. Only runs when {@see $diskState} is in `warning` mode —
     * during normal operation, the cleanup inside
     * {@see Processes::processPHPWorker()} keeps the directory tidy.
     * Issue #1051.
     */
    private function maybeCleanupOnDiskWarning(): void
    {
        if ($this->diskState !== 'warning') {
            return;
        }
        $now = time();
        if (($now - $this->lastDiskWarningCleanupTime) < self::DISK_WARNING_CLEANUP_INTERVAL_SEC) {
            return;
        }
        $this->lastDiskWarningCleanupTime = $now;

        try {
            Processes::cleanupStalePidFilesIn(Processes::getLockFileDir());
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Forced PID-dir cleanup during disk pressure (issue #1051 recovery path)',
                LOG_NOTICE
            );
        } catch (Throwable $e) {
            // Best-effort — cleanup failure must not propagate, the
            // main loop is the only thing keeping the system going.
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Forced cleanup failed: ' . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Emergency handler: kills the fattest PHP process (excluding whitelist) to free memory.
     *
     * @param int $memTotal Total memory in kB
     * @param int $memAvailable Available memory in kB
     * @param float $availablePercent Available memory percentage
     */
    private function handleMemoryEmergency(int $memTotal, int $memAvailable, float $availablePercent): void
    {
        SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                'MEMORY EMERGENCY: available=%.1f%% (%dMB/%dMB) — looking for process to kill',
                $availablePercent,
                (int)($memAvailable / 1024),
                (int)($memTotal / 1024)
            ),
            LOG_ERR
        );

        $phpProcesses = Processes::getPhpProcessesWithRss();
        if (empty($phpProcesses)) {
            return;
        }

        // Find the fattest process not in whitelist
        foreach ($phpProcesses as $proc) {
            $isWhitelisted = false;
            foreach (self::EMERGENCY_KILL_WHITELIST as $protected) {
                if (stripos($proc['name'], $protected) !== false) {
                    $isWhitelisted = true;
                    break;
                }
            }
            if ($isWhitelisted) {
                continue;
            }

            // Kill this process
            $rssMB = (int)($proc['rss'] / 1024 / 1024);
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'EMERGENCY KILL: process %s PID=%d RSS=%dMB — freeing memory',
                    $proc['name'],
                    $proc['pid'],
                    $rssMB
                ),
                LOG_ERR
            );
            posix_kill($proc['pid'], SIGKILL);
            return;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'MEMORY EMERGENCY: all PHP processes are whitelisted, cannot free memory',
            LOG_CRIT
        );
    }

    /**
     * Checks if a worker restart should be throttled due to too-frequent restarts.
     * Uses a sliding window to track restart timestamps.
     *
     * @param string $workerClassName The worker class name
     * @return bool True if restart should be skipped (throttled)
     */
    private function shouldThrottleRestart(string $workerClassName): bool
    {
        $now = time();

        // Clean old entries outside the sliding window
        if (isset($this->restartHistory[$workerClassName])) {
            $this->restartHistory[$workerClassName] = array_values(
                array_filter(
                    $this->restartHistory[$workerClassName],
                    static fn(int $ts) => ($now - $ts) < self::THROTTLE_WINDOW_SEC
                )
            );
        }

        $recentCount = count($this->restartHistory[$workerClassName] ?? []);

        // Check throttle tiers (descending order)
        foreach (self::THROTTLE_TIERS as $maxRestarts => $backoffSec) {
            if ($recentCount >= $maxRestarts) {
                // Check if enough time passed since last restart
                $lastRestart = end($this->restartHistory[$workerClassName]);
                if ($lastRestart !== false && ($now - $lastRestart) < $backoffSec) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        sprintf(
                            'THROTTLED: %s restarted %d times in %ds, backing off %ds',
                            $workerClassName,
                            $recentCount,
                            self::THROTTLE_WINDOW_SEC,
                            $backoffSec
                        ),
                        LOG_WARNING
                    );
                    return true;
                }
                break;
            }
        }

        return false;
    }

    /**
     * Records a worker restart timestamp for throttling.
     *
     * @param string $workerClassName The worker class name
     */
    private function recordRestart(string $workerClassName): void
    {
        $this->restartHistory[$workerClassName][] = time();
    }

    /**
     * Logs the RSS of a worker process before restart.
     * Emits a WARNING if RSS exceeds the threshold.
     *
     * @param string $workerClassName The worker class name
     * @param string $workerPID Space-separated PIDs from getPidOfProcess
     */
    private function logWorkerRssBeforeRestart(string $workerClassName, string $workerPID): void
    {
        if (empty($workerPID)) {
            return;
        }
        $pids = array_filter(explode(' ', $workerPID));
        foreach ($pids as $pidStr) {
            $pid = (int)$pidStr;
            $rss = Processes::getProcessRss($pid);
            if ($rss > self::RSS_WARNING_THRESHOLD) {
                $rssMB = (int)($rss / 1024 / 1024);
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'HIGH RSS: %s PID=%d RSS=%dMB before restart',
                        $workerClassName,
                        $pid,
                        $rssMB
                    ),
                    LOG_WARNING
                );
            }
        }
    }

    /**
     * Writes a periodic memory report to syslog.
     * Called every MEMORY_REPORT_INTERVAL seconds with top PHP processes by RSS.
     */
    private function logMemoryReport(): void
    {
        $now = time();
        if (($now - $this->lastMemoryReportTime) < self::MEMORY_REPORT_INTERVAL) {
            return;
        }
        $this->lastMemoryReportTime = $now;

        // Use cached values from getSystemMemoryState() — already called this cycle
        $memTotal = $this->cachedMeminfo['memTotal'];
        $memAvailable = $this->cachedMeminfo['memAvailable'];
        $availablePercent = $this->cachedMeminfo['availablePercent'];

        if ($memTotal === 0) {
            return;
        }

        $phpProcesses = Processes::getPhpProcessesWithRss();
        $processCount = count($phpProcesses);

        // Top 3 by RSS
        $topEntries = [];
        foreach (array_slice($phpProcesses, 0, 3) as $proc) {
            $topEntries[] = sprintf('%s=%dMB', $proc['name'], (int)($proc['rss'] / 1024 / 1024));
        }
        $topStr = implode(', ', $topEntries);

        SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                'Memory report: available=%.0f%% (%dMB/%dMB), PHP processes: %d, top RSS: %s',
                $availablePercent,
                (int)($memAvailable / 1024),
                (int)($memTotal / 1024),
                $processCount,
                $topStr ?: 'none'
            ),
            LOG_INFO
        );
    }

    /**
     * Force-kill processes that were sent SIGTERM but didn't die within POOL_KILL_TIMEOUT_SEC.
     * Also cleans up entries for processes that already exited.
     */
    private function reapPendingKills(): void
    {
        $now = time();
        foreach ($this->pendingKills as $pid => $sentAt) {
            if (!posix_kill($pid, 0)) {
                // Process already dead — clean up
                unset($this->pendingKills[$pid]);
                continue;
            }
            if (($now - $sentAt) > self::POOL_KILL_TIMEOUT_SEC) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'Force-killing stale process PID=%d after %ds timeout',
                        $pid,
                        self::POOL_KILL_TIMEOUT_SEC
                    ),
                    LOG_WARNING
                );
                posix_kill($pid, SIGKILL);
                unset($this->pendingKills[$pid]);
            }
        }
    }

    /**
     * Check and maintain a pool of worker instances
     *
     * @param string $workerClassName The worker class name
     * @param int $targetCount Number of instances to maintain
     */
    private function checkWorkerPool(string $workerClassName, int $targetCount): void
    {
        try {
            // 1. Force-kill processes that didn't die after SIGTERM within timeout
            $this->reapPendingKills();

            $poolManager = new WorkerPoolManager();

            // Clean orphan processes first
            $killedOrphans = $poolManager->cleanOrphanProcesses($workerClassName);
            if (!empty($killedOrphans)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf(
                        "Cleaned %d orphan processes for %s: %s",
                        count($killedOrphans),
                        $workerClassName,
                        implode(', ', $killedOrphans)
                    ),
                    LOG_WARNING
                );
            }

            // 2. Count actual running processes by PID (ground truth, not pool registry)
            $actualPids = array_map(
                'intval',
                array_filter(explode(' ', Processes::getPidOfProcess($workerClassName)))
            );
            $actualCount = count($actualPids);
            $maxAllowed = $targetCount + 1; // +1 slot for graceful rollover during restart

            SystemMessages::sysLogMsg(
                static::class,
                "Checking worker pool: $workerClassName - $actualCount actual PIDs, $targetCount target (+1 rollover)",
                LOG_DEBUG
            );

            // 3. Kill excess processes (oldest first) if over the rollover limit
            if ($actualCount > $maxAllowed) {
                sort($actualPids, SORT_NUMERIC); // lower PID = older process
                $excessPids = array_slice($actualPids, 0, $actualCount - $maxAllowed);
                foreach ($excessPids as $pid) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        sprintf(
                            "Killing excess pool process: %s PID=%d (%d running, %d allowed)",
                            $workerClassName,
                            $pid,
                            $actualCount,
                            $maxAllowed
                        ),
                        LOG_WARNING
                    );
                    posix_kill($pid, SIGTERM);
                    $this->pendingKills[$pid] = time();
                }
                // Don't spawn anything this cycle — wait for cleanup
                return;
            }

            // 4. If actual count exceeds target, track rollover duration
            if ($actualCount > $targetCount) {
                if (!isset($this->rolloverSince[$workerClassName])) {
                    $this->rolloverSince[$workerClassName] = time();
                }
                $rolloverDuration = time() - $this->rolloverSince[$workerClassName];

                if ($rolloverDuration > self::POOL_ROLLOVER_TIMEOUT_SEC) {
                    // Rollover persisted too long — kill oldest excess to restore exact target
                    sort($actualPids, SORT_NUMERIC);
                    $excessPids = array_slice($actualPids, 0, $actualCount - $targetCount);
                    foreach ($excessPids as $pid) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf(
                                "Killing stale rollover process: %s PID=%d (rollover for %ds, target=%d)",
                                $workerClassName,
                                $pid,
                                $rolloverDuration,
                                $targetCount
                            ),
                            LOG_WARNING
                        );
                        posix_kill($pid, SIGTERM);
                        $this->pendingKills[$pid] = time();
                    }
                    unset($this->rolloverSince[$workerClassName]);
                }
                // Either way, don't spawn while over target
                return;
            }

            // Pool is at or below target — clear rollover tracker
            unset($this->rolloverSince[$workerClassName]);

            // 5. Determine missing instances from pool registry
            $activeWorkers = $poolManager->getActiveWorkers($workerClassName);
            $runningInstanceIds = array_column($activeWorkers, 'instance_id');

            // Check for duplicates before starting new instances
            $instanceCounts = array_count_values($runningInstanceIds);
            foreach ($instanceCounts as $instanceId => $count) {
                if ($count > 1) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Duplicate instance $instanceId detected for $workerClassName, cleaning up",
                        LOG_WARNING
                    );

                    // Get all workers with this instance ID
                    $duplicates = array_filter($activeWorkers, function ($w) use ($instanceId) {
                        return $w['instance_id'] == $instanceId;
                    });

                    // Sort by start time (keep newest)
                    usort($duplicates, function ($a, $b) {
                        return $b['start_time'] <=> $a['start_time'];
                    });

                    // Kill older duplicates
                    for ($j = 1; $j < count($duplicates); $j++) {
                        $pid = $duplicates[$j]['pid'];
                        $poolManager->unregisterWorker($workerClassName, $pid);
                        posix_kill($pid, SIGTERM);
                        $this->pendingKills[$pid] = time();
                    }
                }
            }

            // Re-check active workers after cleanup
            $activeWorkers = $poolManager->getActiveWorkers($workerClassName);
            $runningInstanceIds = array_column($activeWorkers, 'instance_id');

            $missingInstances = [];
            for ($i = 1; $i <= $targetCount; $i++) {
                if (!in_array($i, $runningInstanceIds)) {
                    $missingInstances[] = $i;
                }
            }

            // 6. Spawn only what the PID-based budget allows
            $pidBudget = $maxAllowed - $actualCount;
            if ($pidBudget < count($missingInstances)) {
                $missingInstances = array_slice($missingInstances, 0, $pidBudget);
            }

            if (!empty($missingInstances)
                && !$this->isModuleInCrashLoop($workerClassName)
                && !$this->isCoreWorkerInCrashLoop($workerClassName)
                && $this->memoryState === 'normal'
                && $this->diskState === 'normal'
                && !$this->shouldThrottleRestart($workerClassName)
            ) {
                // Record each instance spawn individually for accurate throttle counting
                foreach ($missingInstances as $ignored) {
                    $this->recordRestart($workerClassName);
                }
                foreach ($missingInstances as $instanceId) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Starting worker instance $instanceId for $workerClassName",
                        LOG_NOTICE
                    );

                    $workerPath = Util::getFilePathByClassName($workerClassName);
                    $php = Util::which('php');
                    $command = "$php -f $workerPath start --instance-id=$instanceId > /dev/null 2>&1 &";
                    shell_exec($command);
                }
            }

            // Clean dead workers from pool
            $cleanedCount = $poolManager->cleanDeadWorkers();
            if ($cleanedCount > 0) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Cleaned $cleanedCount dead workers from pool",
                    LOG_DEBUG
                );
            }

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error checking worker pool for $workerClassName: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
}

// Start worker process
$workerClassname = WorkerSafeScriptsCore::class;
try {
    // If command-line arguments are provided, set the process title and check for active processes.
    if (isset($argv) && count($argv) > 1) {
        cli_set_process_title("{$workerClassname} {$argv[1]}");
        $activeProcesses = Processes::getPidOfProcess("{$workerClassname} {$argv[1]}", posix_getpid());
        if (!empty($activeProcesses)) {
             return;
        }
        $worker = WorkerSafeScriptsCore::getInstance();

        // Depending on the command-line argument, start or restart the worker.
        if ($argv[1] === 'start') {
            $worker->start($argv);
            SystemMessages::sysLogMsg($workerClassname, "Normal exit after start ended", LOG_DEBUG);
        } elseif ($argv[1] === 'restart' || $argv[1] === 'reload') {
            $worker->restart();
            SystemMessages::sysLogMsg($workerClassname, "Normal exit after restart ended", LOG_DEBUG);
        } elseif ($argv[1] === 'soft-restart') {
            $worker->restart(true);
            SystemMessages::sysLogMsg($workerClassname, "Normal exit after soft restart ended", LOG_DEBUG);
        }
    }
} catch (Throwable $e) {
    // If an exception is thrown, log it.
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
}
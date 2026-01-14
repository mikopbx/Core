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
use MikoPBX\Core\System\System;
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
use MikoPBX\Core\Workers\WorkerProviderStatusMonitor;
use MikoPBX\Core\Workers\WorkerExtensionStatusMonitor;
use MikoPBX\Core\Workers\WorkerAuthFailureMonitor;
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Core\Workers\WorkerS3Upload;
use MikoPBX\Core\Workers\WorkerS3CacheCleaner;
use MikoPBX\Core\Workers\WorkerSoundFilesInit;
use MikoPBX\Core\Workers\WorkerWav2Webm;
use MikoPBX\Modules\Config\SystemConfigInterface;
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
     * Singleton instance
     */
    private static ?self $instance = null;

    /**
     * Last check timestamps for each worker
     * @var array<string, int>
     */
    private array $lastCheckTimes = [];

    /**
     * Redis connection instance
     * @var \Redis
     */
    protected $redis;

    /**
     * Initialize the singleton instance
     * This is called after construction to set up the instance
     */
    private function initialize(): void
    {
        // Any initialization code can go here
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
                    WorkerProviderStatusMonitor::class,
                    WorkerExtensionStatusMonitor::class,
                    WorkerAuthFailureMonitor::class,
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
                    WorkerS3Upload::class,
                    WorkerS3CacheCleaner::class,
                    WorkerNotifyAdministrator::class,
                    WorkerWav2Webm::class,
                ],
        ];

        // Get the list of module workers.
        $arrModulesWorkers = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::GET_MODULE_WORKERS);
        $arrModulesWorkers = array_values($arrModulesWorkers);
        $arrModulesWorkers = array_merge(...$arrModulesWorkers);

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
        // Signal handlers are registered automatically in parent constructor
        // When SIGUSR1 is received, $this->needRestart will be set to true
        
        // Wait for the system to fully boot.
        PBX::waitFullyBooted();

        while (!$this->needRestart) {

            // If the system is booting, do not start the workers.
            if (System::isBooting()) {
                sleep(5);
                continue;
            }


            // Prepare the list of workers to be started.
            $arrWorkers = $this->prepareWorkersList();
            
            $tasks = [];
            foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
                foreach ($workersWithCurrentType as $worker) {
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
        
        // If needRestart is true, perform graceful restart
        if ($this->needRestart) {
            SystemMessages::sysLogMsg(
                static::class,
                "Received restart signal, performing graceful restart",
                LOG_NOTICE
            );
            
            // First, remove ourselves from the process list by changing process title
            cli_set_process_title("WorkerSafeScriptsCore exiting");
            
            // Now start new instance using standard mechanism
            // Since we changed our process title, getPidOfProcess won't find us
            Processes::processPHPWorker(static::class, 'start', 'start');
            
            SystemMessages::sysLogMsg(
                static::class,
                "New instance started, exiting current instance",
                LOG_NOTICE
            );
            
            // Exit current instance
            exit(0);
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
            if (false === $result) {
                // Kill the entire process group before restarting
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
        if (false === $result) {
            // Kill the entire process group before restarting
            if ($WorkerPID !== '') {
                // Send SIGTERM to process group
                posix_kill(-intval($WorkerPID), SIGTERM);
                sleep(1); // Give processes time to cleanup
                // Force kill any remaining processes
                posix_kill(-intval($WorkerPID), SIGKILL);
            }
            
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
     *
     * @param string $workerClassName The class name of the worker.
     * @param int $level The recursion level.
     */
    public function checkWorkerAMI(string $workerClassName, int $level = 0): void
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
                // We have the service PID, so we will ping it
                $am = Util::getAstManager();
                $res_ping = $am->pingAMIListener($this->makePingTubeName($workerClassName));
                if (false === $res_ping) {
                    SystemMessages::sysLogMsg(__METHOD__, 'Restart...', LOG_ERR);
                }
            }

            if ($res_ping === false && $level < 10) {
                Processes::processPHPWorker($workerClassName);
                SystemMessages::sysLogMsg(__METHOD__, "Service {$workerClassName} started.", LOG_NOTICE);
                // Wait 1 second while service will be ready to listen requests
                sleep(1);

                // Check service again
                $this->checkWorkerAMI($workerClassName, $level + 1);
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
     * Check and maintain a pool of worker instances
     * 
     * @param string $workerClassName The worker class name
     * @param int $targetCount Number of instances to maintain
     */
    private function checkWorkerPool(string $workerClassName, int $targetCount): void
    {
        try {
            $poolManager = new WorkerPoolManager();
            
            // Clean orphan processes first
            $killedOrphans = $poolManager->cleanOrphanProcesses($workerClassName);
            if (!empty($killedOrphans)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    sprintf("Cleaned %d orphan processes for %s: %s", 
                        count($killedOrphans), 
                        $workerClassName, 
                        implode(', ', $killedOrphans)
                    ),
                    LOG_WARNING
                );
            }
            
            // Get active workers from pool
            $activeWorkers = $poolManager->getActiveWorkers($workerClassName);
            $runningCount = count($activeWorkers);
            
            SystemMessages::sysLogMsg(
                static::class,
                "Checking worker pool: $workerClassName - $runningCount/$targetCount instances running",
                LOG_DEBUG
            );
            
            // Determine which instances are missing
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
                    $duplicates = array_filter($activeWorkers, function($w) use ($instanceId) {
                        return $w['instance_id'] == $instanceId;
                    });
                    
                    // Sort by start time (keep newest)
                    usort($duplicates, function($a, $b) {
                        return $b['start_time'] <=> $a['start_time'];
                    });
                    
                    // Kill older duplicates
                    for ($j = 1; $j < count($duplicates); $j++) {
                        $pid = $duplicates[$j]['pid'];
                        $poolManager->unregisterWorker($workerClassName, $pid);
                        posix_kill($pid, SIGTERM);
                    }
                }
            }
            
            // Re-check active workers after cleanup
            $activeWorkers = $poolManager->getActiveWorkers($workerClassName);
            $runningInstanceIds = array_column($activeWorkers, 'instance_id');
            
            // Start missing instances
            for ($i = 1; $i <= $targetCount; $i++) {
                if (!in_array($i, $runningInstanceIds)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Starting worker instance $i for $workerClassName",
                        LOG_NOTICE
                    );
                    
                    $workerPath = Util::getFilePathByClassName($workerClassName);
                    $php = Util::which('php');
                    $command = "$php -f $workerPath start --instance-id=$i > /dev/null 2>&1 &";
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
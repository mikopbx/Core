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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\Common\Providers\{PBXConfModulesProvider, RedisClientProvider};
use MikoPBX\Core\System\{BeanstalkClient, PBX, Processes, SystemMessages, Util};
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerBeanstalkdTidyUp;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerCheckFail2BanAlive;
use MikoPBX\Core\Workers\WorkerLogRotate;
use MikoPBX\Core\Workers\WorkerMarketplaceChecker;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyAdministrator;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Modules\Config\SystemConfigInterface;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Fiber;
use Throwable;
use RuntimeException;

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
     * @throws Throwable
     */
    public function restart(): void
    {
        // Get all workers that need to be restarted
        $arrWorkers = $this->prepareWorkersList();
        
        // Collect all running workers and their forks
        $runningWorkers = [];
        $workerForks = [];
        
        // Create tasks for collecting PIDs
        $pidCollectionTasks = [];
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $pidCollectionTasks[] = function() use ($worker, &$runningWorkers, &$workerForks) {
                    // Get main worker PID
                    $mainPid = Processes::getPidOfProcess($worker);
                    if (!empty($mainPid)) {
                        $runningWorkers[$worker] = $mainPid;
                        
                        // Get forked processes
                        $forkPattern = "$worker-";
                        $forkedPids = Processes::getPidOfProcess($forkPattern);
                        if (!empty($forkedPids)) {
                            $workerForks[$worker] = array_filter(explode(' ', $forkedPids));
                        }
                    }
                    Fiber::suspend();
                };
            }
        }
        
        // Execute PID collection in parallel
        $this->executeParallel($pidCollectionTasks);
        
        SystemMessages::sysLogMsg(
            static::class,
            "Starting restart process for " . count($runningWorkers) . " workers",
            LOG_NOTICE
        );
        
        // Create tasks for starting new worker instances
        $startTasks = [];
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $startTasks[] = function() use ($worker) {
                    Processes::processPHPWorker($worker, 'start');
                    Fiber::suspend();
                };
            }
        }
        
        // Start new instances in parallel
        $this->executeParallel($startTasks);
        
        // Wait for new instances to initialize
        SystemMessages::sysLogMsg(
            static::class,
            "Started new worker instances, waiting for them to initialize",
            LOG_NOTICE
        );
        sleep(3);
        
        // Create tasks for graceful shutdown of old instances
        $shutdownTasks = [];
        
        // Signal all workers to begin graceful shutdown
        SystemMessages::sysLogMsg(
            static::class,
            "Sending graceful shutdown signal (SIGUSR1) to running workers",
            LOG_NOTICE
        );
        
        // First handle main processes with SIGUSR1
        foreach ($runningWorkers as $worker => $pid) {
            $shutdownTasks[] = function() use ($pid, $worker) {
                // Send SIGUSR1 to main process
                if (posix_kill((int)$pid, SIGUSR1)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Sent SIGUSR1 to $worker (PID: $pid)",
                        LOG_DEBUG
                    );
                }
                Fiber::suspend();
            };
        }
        
        // Execute main process graceful shutdown in parallel
        $this->executeParallel($shutdownTasks);
        
        // Allow more time for graceful shutdown (10-15 seconds should be sufficient)
        SystemMessages::sysLogMsg(
            static::class,
            "Waiting for workers to complete active tasks (graceful shutdown)",
            LOG_NOTICE
        );
        
        // Check if workers have gracefully shutdown
        $gracefulShutdownStart = time();
        $gracefulShutdownTimeout = 15; // seconds
        
        while (time() - $gracefulShutdownStart < $gracefulShutdownTimeout) {
            $allShutdown = true;
            
            foreach ($runningWorkers as $worker => $pid) {
                if (posix_kill((int)$pid, 0)) {
                    // Process still exists
                    $allShutdown = false;
                    break;
                }
            }
            
            if ($allShutdown) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "All workers have gracefully shutdown",
                    LOG_NOTICE
                );
                break;
            }
            
            sleep(1);
        }
        
        // Create tasks for force termination of any remaining processes
        $terminateTasks = [];
        
        // Check and force terminate main processes that didn't shut down gracefully
        foreach ($runningWorkers as $worker => $pid) {
            if (posix_kill((int)$pid, 0)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Worker $worker (PID: $pid) didn't shut down gracefully, sending SIGTERM",
                    LOG_WARNING
                );
                
                $terminateTasks[] = function() use ($pid) {
                    posix_kill((int)$pid, SIGTERM);
                    Fiber::suspend();
                };
            }
        }
        
        // Terminate any remaining forks
        foreach ($workerForks as $worker => $forkPids) {
            foreach ($forkPids as $pid) {
                if (posix_kill((int)$pid, 0)) {
                    $terminateTasks[] = function() use ($pid) {
                        posix_kill((int)$pid, SIGTERM);
                        Fiber::suspend();
                    };
                }
            }
        }
        
        // Execute termination in parallel if needed
        if (!empty($terminateTasks)) {
            $this->executeParallel($terminateTasks);
            // Give processes time to terminate
            sleep(2);
        }
        
        SystemMessages::sysLogMsg(__CLASS__, "All workers have been restarted with new codebase", LOG_NOTICE);
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
                    WorkerPrepareAdvice::class,
                    WorkerMarketplaceChecker::class,
                    WorkerBeanstalkdTidyUp::class,
                    WorkerCheckFail2BanAlive::class,
                    WorkerLogRotate::class,
                    WorkerRemoveOldRecords::class,
                    WorkerNotifyAdministrator::class,
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
        // Wait for the system to fully boot.
        PBX::waitFullyBooted();

        while (true) {
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
            $redis = RedisClientProvider::getWorkerManagementConnection($this->di);
            if ($redis === null) {
                throw new RuntimeException('Failed to create Redis connection');
            }

            $heartbeatKey = WorkerRedisBase::REDIS_HEARTBEAT_KEY_PREFIX . $workerClassName;

            $lastHeartbeat = $redis->get($heartbeatKey);

            if ($lastHeartbeat !== false && (time() - (int)$lastHeartbeat) < 10) {
                return;
            }

            // Check status key instead of using pub/sub
            $statusKey = WorkerRedisBase::REDIS_STATUS_KEY_PREFIX . $workerClassName;
            $status = $redis->get($statusKey);

            if ($status !== false) {
                $status = json_decode($status, true);
                if (isset($status['updated_at']) && (microtime(true) - $status['updated_at']) < 10) {
                    return;
                }
            }

            SystemMessages::sysLogMsg(
                static::class,
                "Worker status not found or stale - restarting",
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
        }
    }
} catch (Throwable $e) {
    // If an exception is thrown, log it.
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
}
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
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerBeanstalkdTidyUp;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerCheckFail2BanAlive;
use MikoPBX\Core\Workers\WorkerLogRotate;
use MikoPBX\Core\Workers\WorkerMarketplaceChecker;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyAdministrator;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Core\Workers\WorkerRedisBase;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
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
     * @throws Throwable
     */
    public function restart(): void
    {
        // Get all workers that need to be restarted
        $arrWorkers = $this->prepareWorkersList();
        
        // Collect all running workers and their forks
        $runningWorkers = [];
        $workerPools = [];
        
        // Create tasks for collecting PIDs
        $pidCollectionTasks = [];
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $pidCollectionTasks[] = function() use ($worker, &$runningWorkers, &$workerPools) {
                    // Check if worker uses pool
                    $maxProc = $this->getWorkerInstanceCount($worker);
                    
                    if ($maxProc > 1) {
                        // This is a pool worker - collect all instances
                        $pattern = "$worker";
                        $poolPids = Processes::getPidOfProcess($pattern);
                        if (!empty($poolPids)) {
                            $workerPools[$worker] = [
                                'maxProc' => $maxProc,
                                'pids' => array_filter(explode(' ', $poolPids))
                            ];
                        }
                    } else {
                        // Regular single worker
                        $mainPid = Processes::getPidOfProcess($worker);
                        if (!empty($mainPid)) {
                            $runningWorkers[$worker] = $mainPid;
                        }
                    }
                    Fiber::suspend();
                };
            }
        }
        
        // Execute PID collection in parallel
        $this->executeParallel($pidCollectionTasks);
        
        // Count total workers to restart
        $totalWorkers = count($runningWorkers) + array_sum(array_map(function($pool) {
            return count($pool['pids']);
        }, $workerPools));
        
        // Log the start of restart process with detailed information
        SystemMessages::sysLogMsg(
            static::class,
            sprintf(
                "Starting restart process for %d worker instances. Regular workers: %d, Pool workers: %d", 
                $totalWorkers,
                count($runningWorkers),
                count($workerPools)
            ),
            LOG_NOTICE
        );
        
        // Детально логируем обнаруженные пулы воркеров
        foreach ($workerPools as $worker => $poolInfo) {
            SystemMessages::sysLogMsg(
                static::class,
                sprintf(
                    "Detected worker pool: %s, maxProc: %d, running PIDs: %s",
                    $worker,
                    $poolInfo['maxProc'],
                    implode(',', $poolInfo['pids'])
                ),
                LOG_NOTICE
            );
        }
        
        // STEP 1: Start new worker instances first
        // This ensures new workers are ready to take jobs before old ones exit
        $startTasks = [];
        $startedWorkers = [];

        // Приоритизируем запуск WorkerApiCommands - они самые критичные для UI
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            // Сортируем воркеры так, чтобы API-воркеры запускались первыми
            $sortedWorkers = $workersWithCurrentType;
            usort($sortedWorkers, function($a, $b) {
                $isApiWorkerA = strpos($a, 'WorkerApiCommands') !== false;
                $isApiWorkerB = strpos($b, 'WorkerApiCommands') !== false;
                
                if ($isApiWorkerA && !$isApiWorkerB) {
                    return -1; // A должен быть раньше B
                } elseif (!$isApiWorkerA && $isApiWorkerB) {
                    return 1; // B должен быть раньше A
                }
                return 0; // Порядок не важен
            });
            
            foreach ($sortedWorkers as $worker) {
                $maxProc = $this->getWorkerInstanceCount($worker);
                
                // Если это API-воркер, создаем все экземпляры сразу (не в фоновом режиме)
                // и дожидаемся полной их инициализации перед продолжением
                if (strpos($worker, 'WorkerApiCommands') !== false) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Starting ALL instances of critical worker {$worker} synchronously",
                        LOG_NOTICE
                    );
                    
                    // Для WorkerApiCommands создаем все инстансы сразу, но используем стандартный механизм
                    for ($i = 1; $i <= $maxProc; $i++) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Starting critical worker instance {$i}/{$maxProc}: {$worker}",
                            LOG_NOTICE
                        );
                        
                        // Используем стандартный механизм запуска, но с правильными параметрами instanceId
                        // Это гарантирует, что процесс будет корректно запущен и залогирован
                        Processes::processPHPWorker($worker, 'start');
                        
                        // Дополнительно проверим, что воркер действительно запущен
                        sleep(1);
                        $pidFile = Processes::getPidFilePath($worker, $i);
                        if (file_exists($pidFile)) {
                            $pid = trim(file_get_contents($pidFile));
                            SystemMessages::sysLogMsg(
                                static::class,
                                sprintf("Worker %s instance %d started with PID %s", $worker, $i, $pid),
                                LOG_NOTICE
                            );
                        } else {
                            SystemMessages::sysLogMsg(
                                static::class,
                                sprintf("WARNING: PID file not found for %s instance %d", $worker, $i),
                                LOG_WARNING
                            );
                        }
                    }
                    
                    // Ждем дополнительное время, чтобы воркеры полностью инициализировались
                    sleep(3); 
                    $startedWorkers[$worker] = true;
                    
                    // Проверяем, что все воркеры действительно запустились
                    $allWorkersRunning = true;
                    for ($i = 1; $i <= $maxProc; $i++) {
                        $pidFile = Processes::getPidFilePath($worker, $i);
                        if (!file_exists($pidFile)) {
                            $allWorkersRunning = false;
                            SystemMessages::sysLogMsg(
                                static::class,
                                "WARNING: PID file not found for {$worker} instance {$i}",
                                LOG_WARNING
                            );
                        }
                    }
                    
                    if (!$allWorkersRunning) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "ERROR: Not all instances of {$worker} started correctly!",
                            LOG_ERR
                        );
                    } else {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "All {$maxProc} instances of {$worker} started successfully",
                            LOG_NOTICE
                        );
                    }
                } else if ($maxProc > 1) {
                    // Это пул воркеров, но не API-воркеры
                    // Добавляем их в список задач для запуска
                    for ($i = 1; $i <= $maxProc; $i++) {
                        $startTasks[] = function() use ($worker, $i, &$startedWorkers) {
                            SystemMessages::sysLogMsg(
                                static::class,
                                "Starting new instance {$i} of pool worker {$worker}",
                                LOG_NOTICE
                            );
                            Processes::processPHPWorker($worker, 'start');
                            $startedWorkers[$worker] = true;
                            Fiber::suspend();
                        };
                    }
                } else {
                    // Обычный одиночный воркер
                    $startTasks[] = function() use ($worker, &$startedWorkers) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Starting new instance of {$worker}",
                            LOG_NOTICE
                        );
                        Processes::processPHPWorker($worker, 'start');
                        $startedWorkers[$worker] = true;
                        Fiber::suspend();
                    };
                }
            }
        }
        
        // Start remaining new instances in parallel
        if (!empty($startTasks)) {
            $this->executeParallel($startTasks);
        }
        
        // Wait for new instances to initialize and become ready to process jobs
        SystemMessages::sysLogMsg(
            static::class,
            "Started new worker instances, waiting for them to initialize",
            LOG_NOTICE
        );
        sleep(5); // Give more time for proper initialization
        
        // STEP 2: Signal old workers to gracefully shutdown
        // They will finish current jobs and then exit
        $shutdownTasks = [];
        
        // Handle regular workers
        foreach ($runningWorkers as $worker => $pid) {
            $shutdownTasks[] = function() use ($pid, $worker) {
                if (posix_kill((int)$pid, SIGUSR1)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Sent SIGUSR1 to {$worker} (PID: {$pid})",
                        LOG_DEBUG
                    );
                }
                Fiber::suspend();
            };
        }
        
        // Handle worker pools
        foreach ($workerPools as $worker => $poolInfo) {
            foreach ($poolInfo['pids'] as $pid) {
                $shutdownTasks[] = function() use ($pid, $worker) {
                    if (posix_kill((int)$pid, SIGUSR1)) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Sent SIGUSR1 to {$worker} pool instance (PID: {$pid})",
                            LOG_DEBUG
                        );
                    }
                    Fiber::suspend();
                };
            }
        }
        
        // Execute graceful shutdown signals in parallel
        $this->executeParallel($shutdownTasks);
        
        // STEP 3: Wait for graceful shutdown with sufficient timeout
        SystemMessages::sysLogMsg(
            static::class,
            "Waiting for workers to complete active tasks (graceful shutdown)",
            LOG_NOTICE
        );
        
        $gracefulShutdownStart = time();
        $gracefulShutdownTimeout = 30; // Increased timeout to allow job completion
        
        while (time() - $gracefulShutdownStart < $gracefulShutdownTimeout) {
            $allShutdown = true;
            
            // Check regular workers
            foreach ($runningWorkers as $worker => $pid) {
                if (posix_kill((int)$pid, 0)) {
                    // Process still exists
                    $allShutdown = false;
                    break;
                }
            }
            
            // Check pool workers
            foreach ($workerPools as $worker => $poolInfo) {
                foreach ($poolInfo['pids'] as $pid) {
                    if (posix_kill((int)$pid, 0)) {
                        // Process still exists
                        $allShutdown = false;
                        break 2;
                    }
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
        
        // STEP 4: Force terminate any remaining processes
        $terminateTasks = [];
        
        // Regular workers
        foreach ($runningWorkers as $worker => $pid) {
            if (posix_kill((int)$pid, 0)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Worker {$worker} (PID: {$pid}) didn't shut down gracefully, sending SIGTERM",
                    LOG_WARNING
                );
                
                $terminateTasks[] = function() use ($pid) {
                    posix_kill((int)$pid, SIGTERM);
                    Fiber::suspend();
                };
            }
        }
        
        // Pool worker instances
        foreach ($workerPools as $worker => $poolInfo) {
            foreach ($poolInfo['pids'] as $pid) {
                if (posix_kill((int)$pid, 0)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Worker {$worker} pool instance (PID: {$pid}) didn't shut down gracefully, sending SIGTERM",
                        LOG_WARNING
                    );
                    
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
            
            // Final check and SIGKILL if necessary for regular workers
            foreach ($runningWorkers as $worker => $pid) {
                if (posix_kill((int)$pid, 0)) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Worker {$worker} (PID: {$pid}) still alive, sending SIGKILL",
                        LOG_WARNING
                    );
                    posix_kill((int)$pid, SIGKILL);
                }
            }
            
            // Final check and SIGKILL if necessary for pool workers
            foreach ($workerPools as $worker => $poolInfo) {
                foreach ($poolInfo['pids'] as $pid) {
                    if (posix_kill((int)$pid, 0)) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Worker {$worker} pool instance (PID: {$pid}) still alive, sending SIGKILL",
                            LOG_WARNING
                        );
                        posix_kill((int)$pid, SIGKILL);
                    }
                }
            }
        }
        
        SystemMessages::sysLogMsg(
            static::class, 
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
                        
                        // Добавляем логирование для отладки
                        SystemMessages::sysLogMsg(
                            static::class,
                            sprintf("Worker %s has maxProc=%d", $workerClassName, $maxProc),
                            LOG_DEBUG
                        );
                        
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
            // Инициализируем Redis соединение при необходимости
            if (!isset($this->redis) || !$this->redis) {
                $this->redis = $this->di->get('redis');
            }
            
            $runningInstances = [];
            
            // Get all instances of this worker
            for ($i = 1; $i <= $targetCount; $i++) {
                // Check if worker with this instance ID is running
                $pidFile = Processes::getPidFilePath($workerClassName, $i);
                if (file_exists($pidFile)) {
                    $pid = trim(file_get_contents($pidFile));
                    if (!empty($pid) && posix_kill((int)$pid, 0)) {
                        $runningInstances[$i] = (int)$pid;
                    }
                }
            }
            
            // Count currently running instances
            $runningCount = count($runningInstances);
            
            SystemMessages::sysLogMsg(
                static::class,
                "Checking worker pool: $workerClassName - $runningCount/$targetCount instances running",
                LOG_DEBUG
            );
            
            // Start missing instances with their specific instance-id
            for ($i = 1; $i <= $targetCount; $i++) {
                if (!isset($runningInstances[$i])) {
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
            
            // Check if any instances are stale
            foreach ($runningInstances as $instanceId => $pid) {
                // We can detect stale workers by checking their heartbeat in Redis
                $heartbeatKey = WorkerRedisBase::REDIS_HEARTBEAT_KEY_PREFIX . $workerClassName;
                $statusKey = WorkerRedisBase::REDIS_STATUS_KEY_PREFIX . $workerClassName;
                
                // Most workers update general heartbeat and status keys
                if (class_exists($workerClassName) && is_subclass_of($workerClassName, WorkerRedisBase::class)) {
                    // For Redis-based workers, we can check their heartbeat
                    $lastHeartbeat = $this->redis->get($heartbeatKey);
                    $status = $this->redis->get($statusKey);
                    
                    $isStale = false;
                    
                    if ($lastHeartbeat === false) {
                        // No heartbeat found, check status
                        if ($status === false) {
                            $isStale = true;
                        } else {
                            $status = json_decode($status, true);
                            if (!isset($status['updated_at']) || (microtime(true) - $status['updated_at']) > 30) {
                                $isStale = true;
                            }
                        }
                    } else if ((time() - (int)$lastHeartbeat) > 30) {
                        // Heartbeat too old
                        $isStale = true;
                    }
                    
                    if ($isStale) {
                        SystemMessages::sysLogMsg(
                            static::class,
                            "Worker instance $workerClassName #$instanceId (PID: $pid) appears stale, terminating",
                            LOG_WARNING
                        );
                        
                        // Try graceful shutdown first
                        posix_kill((int)$pid, SIGUSR1);
                        
                        // Wait a bit and check if it's still running
                        sleep(1);
                        
                        // If still running, force terminate
                        if (posix_kill((int)$pid, 0)) {
                            posix_kill((int)$pid, SIGTERM);
                        }
                    }
                }
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
        }
    }
} catch (Throwable $e) {
    // If an exception is thrown, log it.
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
}
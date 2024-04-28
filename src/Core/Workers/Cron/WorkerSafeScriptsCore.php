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

namespace MikoPBX\Core\Workers\Cron;

require_once 'Globals.php';

use Generator;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
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
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Modules\Config\SystemConfigInterface;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Recoil\React\ReactKernel;
use Throwable;

/**
 * Class WorkerSafeScriptsCore
 *
 * Represents the core worker for safe scripts.
 *
 * @package MikoPBX\Core\Workers\Cron
 */
class WorkerSafeScriptsCore extends WorkerBase
{
    // Constants to denote the methods of checking workers' statuses.
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';

    public const CHECK_BY_AMI = 'checkWorkerAMI';
    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';

    /**
     * Restarts all registered workers.
     *
     * @throws Throwable
     */
    public function restart(): void
    {
        // Prepare the list of workers to be restarted.
        $arrWorkers = $this->prepareWorkersList();

        // Start the parallel execution of restart for all the workers.
        ReactKernel::start(
            function () use ($arrWorkers) {
                // Parallel execution https://github.com/recoilphp/recoil
                foreach ($arrWorkers as $workersWithCurrentType) {
                    foreach ($workersWithCurrentType as $worker) {
                        yield $this->restartWorker($worker);
                    }
                }
            }
        );
    }

    /**
     * Prepares the list of workers to start and restart.
     * Collects core and module workers.
     *
     * @return array The prepared workers list.
     */
    private function prepareWorkersList(): array
    {
        // Initialize the workers' list.
        // Each worker type corresponds to a list of workers.
        $arrWorkers = [
            self::CHECK_BY_AMI =>
                [
                ],
            self::CHECK_BY_BEANSTALK =>
                [
                    WorkerApiCommands::class,
                    WorkerCdr::class,
                    WorkerCallEvents::class,
                    WorkerModelsEvents::class,
                    WorkerNotifyByEmail::class,
                    WorkerNotifyError::class,
                ],
            self::CHECK_BY_PID_NOT_ALERT =>
                [
                    WorkerMarketplaceChecker::class,
                    WorkerBeanstalkdTidyUp::class,
                    WorkerCheckFail2BanAlive::class,
                    WorkerLogRotate::class,
                    WorkerRemoveOldRecords::class,
                    WorkerPrepareAdvice::class
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
     * Starts all workers or checks them.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        // Wait for the system to fully boot.
        PBX::waitFullyBooted();

        // Prepare the list of workers to be started.
        $arrWorkers = $this->prepareWorkersList();

        // Start the parallel execution for starting or checking all workers.
        ReactKernel::start(
            function () use ($arrWorkers) {
                // Parallel execution https://github.com/recoilphp/recoil
                foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
                    foreach ($workersWithCurrentType as $worker) {
                        if ($workerType === self::CHECK_BY_BEANSTALK) {
                            yield $this->checkWorkerBeanstalk($worker);
                        } elseif ($workerType === self::CHECK_BY_PID_NOT_ALERT) {
                            yield $this->checkPidNotAlert($worker);
                        } elseif ($workerType === self::CHECK_BY_AMI) {
                            yield $this->checkWorkerAMI($worker);
                        }
                    }
                }
            }
        );
    }

    /**
     * Pings a worker to check if it is dead. If it is, it is killed and started again.
     * Uses Beanstalk queue to send ping and check workers.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return Generator|null
     */
    public function checkWorkerBeanstalk(string $workerClassName): ?Generator
    {
        // Check if the worker is alive. If not, restart it.
        // The check is done by pinging the worker using a Beanstalk queue.
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
        yield;
    }

    /**
     * Checks the PID worker and starts it if it died.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return Generator|null
     */
    public function checkPidNotAlert(string $workerClassName): Generator
    {
        // Check if the worker is alive based on its PID. If not, restart it.
        $start = microtime(true);
        $WorkerPID = Processes::getPidOfProcess($workerClassName);
        $result = ($WorkerPID !== '');
        if (false === $result) {
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
        yield;
    }

    /**
     * Pings a worker to check if it is dead. If it is, it is killed and started again.
     * Uses AMI UserEvent to send ping and check workers.
     *
     * @param string $workerClassName The class name of the worker.
     * @param int $level The recursion level.
     *
     * @return Generator|null
     */
    public function checkWorkerAMI(string $workerClassName, int $level = 0): ?Generator
    {
        // Check if the worker is alive. If not, restart it.
        // The check is done by pinging the worker using an AMI UserEvent.
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
        yield;
    }

    /**
     * Restarts a worker by class name.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return Generator|null
     */
    public function restartWorker(string $workerClassName): ?Generator
    {
        // Restart the worker and yield control back to the calling code.
        Processes::processPHPWorker($workerClassName, 'start', 'restart');
        yield;
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
            SystemMessages::sysLogMsg($workerClassname, "WARNING: Other started process {$activeProcesses} with parameter: {$argv[1]} is working now...", LOG_DEBUG);
            return;
        }
        $worker = new $workerClassname();

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
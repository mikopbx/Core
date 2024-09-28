<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
    public const string CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';

    public const string CHECK_BY_AMI = 'checkWorkerAMI';
    public const string CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';

    /**
     * Restarts all registered workers.
     *
     * @throws Throwable
     */
    public function restart(): void
    {
        // Prepare the list of workers to be restarted.
        $arrWorkers = $this->prepareWorkersList();

        // Asynchronously restart all workers using pcntl_fork.
        foreach ($arrWorkers as $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $pid = pcntl_fork();
                if ($pid == -1) {
                    // Error during fork.
                    throw new \RuntimeException("Failed to fork process");
                } elseif ($pid == 0) {
                    // Child process.
                    try {
                        $this->restartWorker($worker);
                    } catch (Throwable $e) {
                        CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    }
                    exit(0); // Exit the child process.
                }
                // Parent process continues the loop.
            }
        }

        // Optionally, wait for all child processes to finish.
        while (pcntl_waitpid(0, $status) != -1) {
            // You can process the status if needed.
        }
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
        $arrModulesWorkers = array_merge(...array_values($arrModulesWorkers));

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
     * Starts or checks all workers.
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

        // Asynchronously start or check all workers using pcntl_fork.
        foreach ($arrWorkers as $workerType => $workersWithCurrentType) {
            foreach ($workersWithCurrentType as $worker) {
                $pid = pcntl_fork();
                if ($pid == -1) {
                    // Error during fork.
                    throw new \RuntimeException("Failed to fork process");
                } elseif ($pid == 0) {
                    // Child process.
                    try {
                        if ($workerType === self::CHECK_BY_BEANSTALK) {
                            $this->checkWorkerBeanstalk($worker);
                        } elseif ($workerType === self::CHECK_BY_PID_NOT_ALERT) {
                            $this->checkPidNotAlert($worker);
                        } elseif ($workerType === self::CHECK_BY_AMI) {
                            $this->checkWorkerAMI($worker);
                        }
                    } catch (Throwable $e) {
                        CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    }
                    exit(0); // Exit the child process.
                }
                // Parent process continues the loop.
            }
        }

        // Optionally, wait for all child processes to finish.
        while (pcntl_waitpid(0, $status) != -1) {
            // You can process the status if needed.
        }
    }

    /**
     * Checks a worker via Beanstalk and restarts it if it is unresponsive.
     * Uses Beanstalk queue to send ping and check workers.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return void
     */
    public function checkWorkerBeanstalk(string $workerClassName): void
    {
        // Check if the worker is alive. If not, restart it.
        // The check is done by pinging the worker using a Beanstalk queue.
        try {
            $start = microtime(true);
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            $result = false;
            if ($WorkerPID !== '') {
                // Ping the worker via Beanstalk queue.
                $queue = new BeanstalkClient($this->makePingTubeName($workerClassName));
                [$result] = $queue->sendRequest('ping', 5, 1);
            }
            if (false === $result) {
                Processes::processPHPWorker($workerClassName);
                SystemMessages::sysLogMsg(__METHOD__, "Service $workerClassName started.", LOG_NOTICE);
            }
            $timeElapsedSecs = round(microtime(true) - $start, 2);
            if ($timeElapsedSecs > 10) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service $workerClassName processed more than $timeElapsedSecs seconds"
                );
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Checks the worker by PID and restarts it if it has terminated.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return void
     */
    public function checkPidNotAlert(string $workerClassName): void
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
                "WARNING: Service $workerClassName processed more than $timeElapsedSecs seconds"
            );
        }
    }

    /**
     * Checks the worker by PID and restarts it if it has terminated.
     * Uses AMI UserEvent to send ping and check workers.
     *
     * @param string $workerClassName The class name of the worker.
     * @param int $level The recursion level.
     *
     * @return void
     */
    public function checkWorkerAMI(string $workerClassName, int $level = 0): void
    {
        // Check if the worker is alive. If not, restart it.
        // The check is done by pinging the worker using an AMI UserEvent.
        try {
            $start = microtime(true);
            $res_ping = false;
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            if ($WorkerPID !== '') {
                // Ping the worker via AMI.
                $am = Util::getAstManager();
                $res_ping = $am->pingAMIListener($this->makePingTubeName($workerClassName));
                if (false === $res_ping) {
                    SystemMessages::sysLogMsg(__METHOD__, 'Restarting...', LOG_ERR);
                }
            }

            if ($res_ping === false && $level < 10) {
                Processes::processPHPWorker($workerClassName);
                SystemMessages::sysLogMsg(__METHOD__, "Service $workerClassName started.", LOG_NOTICE);
                sleep(1); // Wait 1 second while the service becomes ready to receive requests.

                // Recheck the service.
                $this->checkWorkerAMI($workerClassName, $level + 1);
            }
            $timeElapsedSecs = round(microtime(true) - $start, 2);
            if ($timeElapsedSecs > 10) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service $workerClassName processed more than $timeElapsedSecs seconds"
                );
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Restarts a worker by class name.
     *
     * @param string $workerClassName The class name of the worker.
     */
    public function restartWorker(string $workerClassName): void
    {
        Processes::processPHPWorker($workerClassName, 'start', 'restart');
    }
}

// Start worker process
$workerClassname = WorkerSafeScriptsCore::class;
try {

    // If command-line arguments are provided, set the process title and check for active processes.
    if (isset($argv) && count($argv) > 1) {
        cli_set_process_title("$workerClassname $argv[1]");
        $activeProcesses = Processes::getPidOfProcess("$workerClassname $argv[1]", posix_getpid());
        if (!empty($activeProcesses)) {
            SystemMessages::sysLogMsg($workerClassname, "WARNING: Other started process $activeProcesses with parameter: $argv[1] is working now...", LOG_DEBUG);
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
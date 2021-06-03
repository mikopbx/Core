<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\{BeanstalkClient, PBX, Processes, Util};
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerBeanstalkdTidyUp;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerCheckFail2BanAlive;
use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Core\Workers\WorkerLogRotate;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Recoil\React\ReactKernel;
use Throwable;

class WorkerSafeScriptsCore extends WorkerBase
{
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';

    public const CHECK_BY_AMI = 'checkWorkerAMI';

    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';

    /**
     * Restart all registered workers
     *
     * @throws \Throwable
     */
    public function restart(): void
    {
        $arrWorkers = $this->prepareWorkersList();
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
     * Prepare workers list to start and restart
     * We collect core and modules workers
     *
     * @return array
     */
    private function prepareWorkersList(): array
    {
        $arrWorkers        = [
            self::CHECK_BY_AMI           =>
                [
                    WorkerAmiListener::class,
                ],
            self::CHECK_BY_BEANSTALK     =>
                [
                    WorkerApiCommands::class,
                    WorkerCdr::class,
                    WorkerCallEvents::class,
                    WorkerModelsEvents::class,
                    WorkerNotifyByEmail::class,
                    WorkerNotifyError::class,
                    //WorkerLongPoolAPI::class,
                ],
            self::CHECK_BY_PID_NOT_ALERT =>
                [
                    WorkerLicenseChecker::class,
                    WorkerBeanstalkdTidyUp::class,
                    WorkerCheckFail2BanAlive::class,
                    WorkerLogRotate::class,
                    WorkerRemoveOldRecords::class,
                ],
        ];
        $configClassObj = new ConfigClass();
        $arrModulesWorkers = $configClassObj->hookModulesMethodWithArrayResult(ConfigClass::GET_MODULE_WORKERS);
        $arrModulesWorkers = array_values($arrModulesWorkers);
        $arrModulesWorkers = array_merge(...$arrModulesWorkers);
        if (!empty($arrModulesWorkers)) {
            foreach ($arrModulesWorkers as $moduleWorker) {
                $arrWorkers[$moduleWorker['type']][] = $moduleWorker['worker'];
            }
        }

        return $arrWorkers;
    }

    /**
     * Restart worker by class name
     *
     * @param $workerClassName
     *
     * @return \Generator|null
     */
    public function restartWorker($workerClassName): ?Generator
    {
        Processes::processPHPWorker($workerClassName, 'start','restart');
        yield;
    }

    /**
     * Start all workers or check them
     *
     * @param mixed $argv
     *
     * @throws \Throwable
     */
    public function start($argv): void
    {
        PBX::waitFullyBooted();
        $arrWorkers = $this->prepareWorkersList();
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
     * Ping worker to check it, if it dead we kill and start it again
     * We use Beanstalk queue to send ping and check workers
     *
     * @param $workerClassName string
     *
     * @return \Generator|null
     */
    public function checkWorkerBeanstalk(string $workerClassName): ?Generator
    {
        try {
            $start     = microtime(true);
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            $result    = false;
            if ($WorkerPID !== '') {
                // We had service PID, so we will ping it
                $queue = new BeanstalkClient($this->makePingTubeName($workerClassName));
                // Check service with higher priority
                $result = $queue->request('ping', 5, 1);
            }
            if (false === $result) {
                Processes::processPHPWorker($workerClassName);
                Util::sysLogMsg(__METHOD__, "Service {$workerClassName} started.", LOG_NOTICE);
            }
            $timeElapsedSecs = round(microtime(true) - $start,2);
            if ($timeElapsedSecs > 10) {
                Util::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                    LOG_WARNING
                );
            }
        } catch (Throwable $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage(), LOG_ERR);
        }
        yield;
    }

    /**
     * Checks PID worker and start it it died
     *
     * @param $workerClassName string
     *
     * @return Generator
     */
    public function checkPidNotAlert(string $workerClassName): Generator
    {
        $start     = microtime(true);
        $WorkerPID = Processes::getPidOfProcess($workerClassName);
        $result    = ($WorkerPID !== '');
        if (false === $result) {
            Processes::processPHPWorker($workerClassName);
        }
        $timeElapsedSecs = round(microtime(true) - $start,2);
        if ($timeElapsedSecs > 10) {
            Util::sysLogMsg(
                __CLASS__,
                "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                LOG_WARNING
            );
        }
        yield;
    }

    /**
     * Ping worker to check it, if it dead we kill and start it again
     * We use AMI UserEvent to send ping and check workers
     *
     * @param $workerClassName string  service name
     * @param $level           int  recursion level
     *
     * @return \Generator|null
     */
    public function checkWorkerAMI(string $workerClassName, int $level = 0): ?Generator
    {
        try {
            $start     = microtime(true);
            $res_ping  = false;
            $WorkerPID = Processes::getPidOfProcess($workerClassName);
            if ($WorkerPID !== '') {
                // We had service PID, so we will ping it
                $am       = Util::getAstManager();
                $res_ping = $am->pingAMIListner($this->makePingTubeName($workerClassName));
                if (false === $res_ping) {
                    Util::sysLogMsg(__METHOD__, 'Restart...', LOG_ERR);
                }
            }

            if ($res_ping === false && $level < 10) {
                Processes::processPHPWorker($workerClassName);
                Util::sysLogMsg(__METHOD__, "Service {$workerClassName} started.", LOG_NOTICE);
                // Wait 1 second while service will be ready to listen requests
                sleep(1);

                // Check service again
                $this->checkWorkerAMI($workerClassName, $level + 1);
            }
            $timeElapsedSecs = round(microtime(true) - $start,2);
            if ($timeElapsedSecs > 10) {
                Util::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service {$workerClassName} processed more than {$timeElapsedSecs} seconds",
                    LOG_WARNING
                );
            }
        } catch (Throwable $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage(), LOG_ERR);
        }
        yield;
    }
}

// Start worker process
$workerClassname = WorkerSafeScriptsCore::class;
try {
    if (isset($argv) && count($argv) > 1) {
        cli_set_process_title("{$workerClassname} {$argv[1]}");
        $activeProcesses = Processes::getPidOfProcess("{$workerClassname} {$argv[1]}", posix_getpid());
        if (!empty($activeProcesses)){
            Util::sysLogMsg($workerClassname, "WARNING: Other started process {$activeProcesses} with parameter: {$argv[1]} is working now...", LOG_DEBUG);
            return;
        }
        $worker = new $workerClassname();
        if (($argv[1] === 'start')) {
            $worker->start($argv);
            Util::sysLogMsg($workerClassname, "Normal exit after start ended", LOG_DEBUG);
        } elseif ($argv[1] === 'restart' || $argv[1] === 'reload') {
            $worker->restart();
            Util::sysLogMsg($workerClassname, "Normal exit after restart ended", LOG_DEBUG);
        }
    }
} catch (Throwable $e) {
    global $errorLogger;
    $errorLogger->captureException($e);
    Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
}
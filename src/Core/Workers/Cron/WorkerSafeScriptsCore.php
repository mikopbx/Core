<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Workers\Cron;

require_once 'Globals.php';

use Generator;
use MikoPBX\Core\System\{BeanstalkClient, PBX, Util};
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerCheckFail2BanAlive;
use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Core\Workers\WorkerLogRotate;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use MikoPBX\PBXCoreREST\Workers\WorkerLongPoolAPI;
use Recoil\React\ReactKernel;

class WorkerSafeScriptsCore extends WorkerBase
{
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';

    public const CHECK_BY_AMI = 'checkWorkerAMI';

    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';

    /**
     * Restart all registered workers
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
                    WorkerCdr::class,
                    WorkerCallEvents::class,
                    WorkerModelsEvents::class,
                    WorkerNotifyByEmail::class,
                    WorkerNotifyError::class,
                    WorkerLongPoolAPI::class,
                    WorkerApiCommands::class,
                ],
            self::CHECK_BY_PID_NOT_ALERT =>
                [
                    WorkerLicenseChecker::class,
                    WorkerCheckFail2BanAlive::class,
                    WorkerLogRotate::class
                ],
        ];
        $arrModulesWorkers = [];
        $pbxConfModules    = $this->di->getShared('pbxConfModules');
        foreach ($pbxConfModules as $pbxConfModule) {
            $arrModulesWorkers[] = $pbxConfModule->getModuleWorkers();
        }
        $arrModulesWorkers = array_merge(...$arrModulesWorkers);
        if (count($arrModulesWorkers) > 0) {
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
        Util::restartPHPWorker($workerClassName);
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
            $WorkerPID = Util::getPidOfProcess($workerClassName);
            $result    = false;
            if ($WorkerPID !== '') {
                // We had service PID, so we will ping it
                $queue = new BeanstalkClient($this->makePingTubeName($workerClassName));
                // Check service with higher priority
                $result = $queue->request('ping', 15, 0);
            }
            if (false === $result) {
                Util::restartPHPWorker($workerClassName);
                Util::sysLogMsg(__CLASS__, "Service {$workerClassName} started.");
            }
            $time_elapsed_secs = microtime(true) - $start;
            if ($time_elapsed_secs > 10) {
                Util::sysLogMsg(
                    __CLASS__,
                    "WARNING: Service {$workerClassName} processed more than {$time_elapsed_secs} seconds"
                );
            }
        } catch (\Error $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage());
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
        $WorkerPID = Util::getPidOfProcess($workerClassName);
        $result    = ($WorkerPID !== '');
        if (false === $result) {
            Util::restartPHPWorker($workerClassName);
        }
        $time_elapsed_secs = microtime(true) - $start;
        if ($time_elapsed_secs > 10) {
            Util::sysLogMsg(
                __CLASS__,
                "WARNING: Service {$workerClassName} processed more than {$time_elapsed_secs} seconds"
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
            $WorkerPID = Util::getPidOfProcess($workerClassName);
            if ($WorkerPID !== '') {
                // We had service PID, so we will ping it
                $am       = Util::getAstManager();
                $res_ping = $am->pingAMIListner($this->makePingTubeName($workerClassName));
                if (false === $res_ping) {
                    Util::sysLogMsg('checkWorkerAMI', 'Restart...');
                }
            }

            if ($res_ping === false && $level < 10) {
                Util::restartPHPWorker($workerClassName);
                Util::sysLogMsg(__CLASS__, "Service {$workerClassName} started.");
                // Wait 1 second while service will be ready to listen requests
                sleep(1);

                // Check service again
                $this->checkWorkerAMI($workerClassName, $level + 1);
            }
            $time_elapsed_secs = microtime(true) - $start;
            if ($time_elapsed_secs > 10) {
                Util::sysLogMsg(
                    __CLASS__,
                    "WARNING: Service {$workerClassName} processed more than {$time_elapsed_secs} seconds"
                );
            }
        } catch (\Error $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage());
        }
        yield;
    }
}

// Start worker process
$workerClassname = WorkerSafeScriptsCore::class;
try {
    if (isset($argv) && count($argv) > 1) {
        cli_set_process_title($workerClassname);
        $worker = new $workerClassname();
        if (($argv[1] === 'start')) {
            $worker->start($argv);
        } elseif ($argv[1] === 'restart' || $argv[1] === 'reload') {
            $worker->restart();
        }
    }
} catch (\Error $e) {
    global $errorLogger;
    $errorLogger->captureException($e);
    Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
}
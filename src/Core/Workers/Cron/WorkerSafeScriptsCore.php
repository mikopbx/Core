<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Workers\Cron;

require_once 'Globals.php';

use Generator;
use MikoPBX\Core\System\{BeanstalkClient, Firewall, PBX, Util};
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use MikoPBX\PBXCoreREST\Workers\WorkerLongPoolAPI;
use Recoil\React\ReactKernel;

class WorkerSafeScriptsCore extends WorkerBase
{
    public const CHECK_BY_BEANSTALK     = 'checkWorkerBeanstalk';
    public const CHECK_BY_AMI           = 'checkWorkerAMI';
    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';

    /**
     * Prepare workers list to start and restart
     * We collect core and modules workers
     *
     * @return array
     */
    private function prepareWorkersList(): array
    {
        $arrWorkers = [
            self::CHECK_BY_AMI       =>
                [
                    WorkerAmiListener::class,
                ],
            self::CHECK_BY_BEANSTALK =>
                [
                    WorkerApiCommands::class,
                    WorkerCdr::class,
                    WorkerCallEvents::class,
                    WorkerModelsEvents::class,
                    WorkerNotifyByEmail::class,
                    WorkerNotifyError::class,
                    WorkerLongPoolAPI::class,
                ],
            self::CHECK_BY_PID_NOT_ALERT =>
                [
                    WorkerLicenseChecker::class,
                ]
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
     * Restart all workers in separate process,
     * we use this method after module install or delete
     */
    public static function restartAllWorkers(): void
    {
        $workerSafeScriptsPath = Util::getFilePathByClassName(__CLASS__);
        $phpPath = Util::which('php');
        $WorkerSafeScripts = "{$phpPath} -f {$workerSafeScriptsPath} restart > /dev/null 2> /dev/null";
        Util::mwExecBg($WorkerSafeScripts);
    }

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

        Firewall::checkFail2ban();
    }

    /**
     * Check PID worker and start
     * @param $workerClassName
     * @return Generator
     */
    public function checkPidNotAlert($workerClassName): Generator{
        $WorkerPID = Util::getPidOfProcess($workerClassName);
        $result    = ($WorkerPID !== '');
        if (false === $result) {
            Util::restartPHPWorker($workerClassName);
        }
        yield;
    }

    /**
     * Ping worker to check it, if it dead we kill and start it again
     * We use Beanstalk queue to send ping and check workers
     *
     * @param $workerClassName
     *
     * @return \Generator|null
     */
    public function checkWorkerBeanstalk($workerClassName): ?Generator
    {
        try {
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
        } catch (\Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage());
        }
        yield;
    }

    /**
     * Ping worker to check it, if it dead we kill and start it again
     * We use AMI UserEvent to send ping and check workers
     *
     * @param $workerClassName - service name
     * @param $level           - recursion level
     *
     * @return \Generator|null
     */
    public function checkWorkerAMI($workerClassName, $level = 0): ?Generator
    {
        try {
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
        } catch (\Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg($workerClassName . '_EXCEPTION', $e->getMessage());
        }
        yield;
    }
}

// Start worker process
$workerClassname = WorkerSafeScriptsCore::class;
cli_set_process_title($workerClassname);
try {
    if (isset($argv) && count($argv) > 1) {
        $worker = new $workerClassname();
        if (($argv[1] === 'start')) {
            $worker->start($argv);
        } elseif ($argv[1] === 'restart'){
            $worker->restart();
        }
    }
} catch (\Exception $e) {
    global $errorLogger;
    $errorLogger->captureException($e);
    Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
}
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\Workers\Cron;

require_once 'globals.php';

use Generator;
use MikoPBX\Core\System\{BeanstalkClient, Firewall, Util};
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Core\Workers\WorkerLongPoolAPI;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Recoil\React\ReactKernel;

class WorkerSafeScriptsCore extends WorkerBase
{
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';

    public const CHECK_BY_AMI = 'checkWorkerAMI';

    /**
     * Start all workers
     * @param mixed $argv
     *
     * @throws \Throwable
     */
    public function start($argv): void
    {
        $this->waitFullyBooted();

        ReactKernel::start(
            function () {
                // Parallel execution https://github.com/recoilphp/recoil
                yield [
                    $this->checkWorkerBeanstalk(WorkerApiCommands::class),
                    $this->checkWorkerBeanstalk(WorkerCdr::class),
                    $this->checkWorkerBeanstalk(WorkerCallEvents::class),
                    $this->checkWorkerBeanstalk(WorkerModelsEvents::class),
                    $this->checkWorkerAMI(WorkerAmiListener::class), // Проверка листнера UserEvent
                    $this->checkWorkerBeanstalk(WorkerLicenseChecker::class),
                    $this->checkWorkerBeanstalk(WorkerNotifyByEmail::class),
                    $this->checkWorkerBeanstalk(WorkerNotifyError::class),
                    $this->checkWorkerBeanstalk(WorkerLongPoolAPI::class),
                ];
            }
        );

        // Modules workers
        $arrModulesWorkers = [];
        $pbxConfModules    = $this->di->getShared('pbxConfModules');
        foreach ($pbxConfModules as $pbxConfModule) {
            $arrModulesWorkers[] = $pbxConfModule->getModuleWorkers();
        }
        $arrModulesWorkers = array_merge(...$arrModulesWorkers);
        if (count($arrModulesWorkers) > 0) {
            ReactKernel::start(
                function () use ($arrModulesWorkers) {
                    // Parallel execution https://github.com/recoilphp/recoil
                    foreach ($arrModulesWorkers as $moduleWorker) {
                        if ($moduleWorker['type'] === self::CHECK_BY_AMI) {
                            yield $this->checkWorkerAMI($moduleWorker['worker']);
                        } else {
                            yield $this->checkWorkerBeanstalk($moduleWorker['worker']);
                        }
                    }
                }
            );
        }

        Firewall::checkFail2ban();
    }

    /**
     * Restart all workers after module installation in separate process
     */
    public static function restartAllWorkers(): void
    {
        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath = Util::which('php');
        $command = "{$phpPath} -f {$workerSafeScriptsPath} restart > /dev/null 2> /dev/null";
        Util::mwExecBg($command);
    }
    /**
     * Restart all workers
     */
    public function restart(): void
    {
        $psPath    = Util::which('ps');
        $grepPath  = Util::which('grep');
        $awkPath   = Util::which('awk');
        $xargsPath = Util::which('xargs');
        $killPath  = Util::which('kill');
        $command   = "{$psPath} -ef | {$grepPath} 'Workers\\\\Worker' | {$grepPath} -v grep | {$grepPath} -v WorkerSafeScriptsCore | {$awkPath} '{print $1}' | {$xargsPath} -r {$killPath} -9";
        Util::mwExec($command);
        $this->start('start');
    }


    /**
     * Ожидаем полной загрузки asterisk.
     *
     * @return bool
     */
    private function waitFullyBooted(): bool
    {
        $time_start = microtime(true);
        $result     = false;
        $out        = [];
        if (Util::isSystemctl()) {
            $options = '';
        } else {
            $options = '-t';
        }
        $timeoutPath  = Util::which('timeout');
        $asteriskPath = Util::which('asterisk');
        while (true) {
            $execResult = Util::mwExec(
                "{$timeoutPath} {$options} 1 {$asteriskPath} -rx'core waitfullybooted'",
                $out
            );
            if ($execResult === 0 && implode('', $out) === 'Asterisk has fully booted.') {
                $result = true;
                break;
            }
            $time = microtime(true) - $time_start;
            if ($time > 60) {
                Util::sysLogMsg(__CLASS__, 'Error: Asterisk has not booted');
                break;
            }
        }

        return $result;
    }

    /**
     * Проверка работы сервиса через beanstalk.
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
     * Check AMI listener
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
    if (isset($argv) && count($argv) > 1){
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
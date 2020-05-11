<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\Workers\Cron;

require_once('globals.php');

use Generator;
use MikoPBX\Core\System\{BeanstalkClient, Firewall, PBX, System, Util};
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Workers\WorkerLicenseChecker;
use MikoPBX\Core\Workers\WorkerLongPoolAPI;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerModuleMonitor;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerNotifyError;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Mikopbx\Service\Main;
use Phalcon\Exception;
use Recoil\React\ReactKernel;

class WorkerSafeScripts extends WorkerBase
{
    private $client_nats;
    private $timeout = 8;
    private $result = false;

    public function start($argv): void
    {
        /** Ротация логов */
        System::gnatsLogRotate();
        System::rotatePhpLog();
        PBX::logRotate();


        $this->client_nats = $this->di->getShared('natsConnection');
        $this->client_nats->connect($this->timeout);

        $this->waitFullyBooted();

        ReactKernel::start(
            function () {
                // Parallel execution https://github.com/recoilphp/recoil
                try {
                    yield [
                        $this->checkWorkerBeanstalk(WorkerCdr::class),
                        $this->checkWorkerBeanstalk(WorkerModelsEvents::class),
                        $this->checkWorkerBeanstalk(WorkerCallEvents::class),
                        $this->checkWorkerBeanstalk(WorkerLicenseChecker::class),
                        $this->checkWorkerBeanstalk(WorkerNotifyByEmail::class),
                        $this->checkWorkerBeanstalk(WorkerNotifyError::class),
                        $this->checkWorkerBeanstalk(WorkerApiCommands::class),
                        $this->checkWorkerBeanstalk(WorkerLongPoolAPI::class),
                        $this->checkWorkerAMI(WorkerAmiListener::class), // Проверка листнера UserEvent
                        $this->checkWorker(WorkerModuleMonitor::class),
                    ];
                } catch (\Exception $e) {
                    global $errorLogger;
                    $errorLogger->captureException($e);
                    Util::sysLogMsg(__CLASS__ . '_EXCEPTION', $e->getMessage());
                }
            }
        );

        // Modules workers
        $arrModulesWorkers = [];
        $pbxConfModules = $this->di->getShared('pbxConfModules');
        foreach ($pbxConfModules as $pbxConfModule){
            $arrModulesWorkers[] = $pbxConfModule->getModuleWorkers();
        }
        $arrModulesWorkers = array_merge(...$arrModulesWorkers);
        if (count($arrModulesWorkers)>0){
            ReactKernel::start(
                function () use ($arrModulesWorkers){
                    // Parallel execution https://github.com/recoilphp/recoil
                    try {
                        foreach ($arrModulesWorkers as $moduleWorker){
                            yield $this->checkWorkerBeanstalk($moduleWorker);
                        }
                    } catch (\Exception $e) {
                        global $errorLogger;
                        $errorLogger->captureException($e);
                        Util::sysLogMsg(__CLASS__ . '_EXCEPTION', $e->getMessage());
                    }
                }
            );
        }


        Firewall::checkFail2ban();
    }

    /**
     * Ожидаем полной загрузки asterisk.
     *
     * @return bool
     */
    private function waitFullyBooted(): bool
    {
        $time_start = microtime(true);

        $res_data = false;
        $out      = [];
        if (Util::isSystemctl()) {
            $options = '';
        } else {
            $options = '-t';
        }

        while (true) {
            $result = Util::mwExec("/usr/bin/timeout {$options} 1 /usr/sbin/asterisk -rx'core waitfullybooted'", $out);
            if ($result === 0 && implode('', $out) === 'Asterisk has fully booted.') {
                $res_data = true;
                break;
            }
            $time = microtime(true) - $time_start;
            if ($time > 60) {
                Util::sysLogMsg('Safe Script', 'Error: Asterisk has not booted');
                break;
            }
        }

        return $res_data;
    }

    /**
     * Проверка работы сервиса через beanstalk.
     *
     * @param $name
     *
     * @throws Exception
     */
    public function checkWorkerBeanstalk($name): ?Generator
    {
        $this->result = false;
        $WorkerPID    = Util::getPidOfProcess($name);
        if ($WorkerPID !== '') {
            // Сервис запущен. Выполним к нему пинг.
            $queue = new BeanstalkClient("ping_{$name}");
            // Выполняем запрос с наибольшим приоритетом.
            $result = $queue->request('ping', 15, 0);
            if (false === $result) {
                $this->startWorker($name);
            }
        } else {
            // Сервис вовсе не запущен.
            $this->startWorker($name);
        }
        yield;
    }

    /**
     * Запуск рабочего процесса.
     *
     * @param        $name
     * @param string $param
     */
    private function startWorker($name, $param = ''): void
    {
        Util::restartWorker($name, $param);
    }

    /**
     * Проверка работы AMI листнера.
     *
     * @param $name  - имя сервиса
     * @param $level - уровень рекурсии
     */
    public function checkWorkerAMI($name, $level = 0): ?Generator
    {
        $res_ping  = false;
        $WorkerPID = Util::getPidOfProcess($name);
        if ($WorkerPID !== '') {
            // Сервис запущен. Выполним к нему пинг.
            $am       = Util::getAstManager();
            $res_ping = $am->pingAMIListner();
            if (false === $res_ping) {
                // Пинг не прошел.
                Util::sysLogMsg('AMI_listner', 'Restart...');
            }
        }

        if ($res_ping === false && $level < 10) {
            $this->startWorker($name, 'start');
            // Сервис не запущен.
            sleep(5);
            // Пытаемся снова запустить / проверить работу сервиса.
            $this->checkWorkerAMI($name, $level + 1);
        }
        yield;
    }

    /**
     * Проверка работы worker.
     *
     * @param $name
     *
     * @throws \Nats\Exception
     */
    public function checkWorker($name): ?Generator
    {
        if ( ! $this->client_nats->isConnected() === true) {
            $this->client_nats->reconnect();
        }
        $this->result = false;
        $WorkerPID    = Util::getPidOfProcess($name);
        if ($WorkerPID !== '') {
            // Сервис запущен. Выполним к нему пинг.
            $this->client_nats->request("ping_{$name}", 'ping', [$this, 'callback']);
            if (false === $this->result) {
                $this->startWorker($name);
            }
        } else {
            // Сервис вовсе не запущен.
            $this->startWorker($name);
        }
        yield;
    }

    public function callback($message): void
    {
        $this->result = true;
    }
}

// Start worker process
$workerClassname = WorkerSafeScripts::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}

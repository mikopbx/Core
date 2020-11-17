<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\System\{BeanstalkClient, System, Util, Processes};
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\AdvicesProcessor;
use MikoPBX\PBXCoreREST\Lib\CdrDBProcessor;
use MikoPBX\PBXCoreREST\Lib\IAXStackProcessor;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use MikoPBX\PBXCoreREST\Lib\SysLogsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\SIPStackProcessor;
use MikoPBX\PBXCoreREST\Lib\StorageManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\SysinfoManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;
use Throwable;

require_once 'Globals.php';

class WorkerApiCommands extends WorkerBase
{
    /**
     * The maximum parallel worker processes
     *
     * @var int
     */
    protected int $maxProc = 1;

    /**
     * Available REST API processors
     */
    private array $processors;


    /**
     * @param $argv
     *
     */
    public function start($argv): void
    {
        $beanstalk = $this->di->getShared('beanstalkConnectionWorkerAPI');
        $beanstalk->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $beanstalk->subscribe(__CLASS__, [$this, 'prepareAnswer']);

        $this->registerProcessors();

        while ($this->needRestart === false) {
            $beanstalk->wait();
        }
    }

    /**
     * Prepares list of available processors
     */
    private function registerProcessors(): void
    {
        $this->processors = [
            'advices' => AdvicesProcessor::class,
            'cdr'     => CdrDBProcessor::class,
            'iax'     => IAXStackProcessor::class,
            'license' => LicenseManagementProcessor::class,
            'sip'     => SIPStackProcessor::class,
            'storage' => StorageManagementProcessor::class,
            'system'  => SystemManagementProcessor::class,
            'syslog'  => SysLogsManagementProcessor::class,
            'sysinfo' => SysinfoManagementProcessor::class,
            'files'   => FilesManagementProcessor::class,
            'modules' => PbxExtensionsProcessor::class
        ];
    }

    /**
     * Process API request from frontend
     *
     * @param BeanstalkClient $message
     *
     */
    public function prepareAnswer(BeanstalkClient $message): void
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            $request   = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $processor = $request['processor'];

            if (array_key_exists($processor, $this->processors)) {
                $res = $this->processors[$processor]::callback($request);
                if ($res->success) {
                    $this->checkNeedReload($request);
                }
            } else {
                $res->success    = false;
                $res->messages[] = "Unknown processor - {$processor} in prepareAnswer";
            }
        } catch (Throwable $exception) {
            $res->messages[] = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
        } finally {
            $message->reply(json_encode($res->getResult()));
        }
    }

    /**
     * Checks if the module or worker needs to be reloaded.
     *
     * @param array $request
     */
    private function checkNeedReload(array $request): void
    {
        // Prevent loop
        if ($request['processor'] === 'workers'
            && $request['action'] === 'needRestartAPIWorkers') {
            $this->needRestart = true;

            return;
        }

        // Check if new code added from modules
        $restartActions = $this->getNeedRestartActions();
        foreach ($restartActions as $processor => $actions) {
            foreach ($actions as $action) {
                if ($processor === $request['processor']
                    && $action === $request['action']) {
                    $this->needRestart = true;
                    break;
                }
            }
        }

        if ($this->needRestart) {
            // Send soft restart to another workers processors
            $activeAnotherProcesses = Processes::getPidOfProcess(self::class, getmypid());
            $processes              = explode(' ', $activeAnotherProcesses);
            if (empty($processes[0])) {
                array_shift($processes);
            }
            foreach ($processes as $process) {
                posix_kill($process, SIGTERM);
            }
        }

        // Restart all another workers
        Processes::restartAllWorkers();
    }

    /**
     * Prepares array of processor => action depends restart this kind worker
     *
     * @return \string[][]
     */
    private function getNeedRestartActions(): array
    {
        return [
            'system'  => [
                'enableModule',
                'disableModule',
                'uninstallModule',
                'installNewModule',
                'restoreDefaultSettings',
            ],
        ];
    }

}

// Start worker process
$workerClassname = WorkerApiCommands::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    while (true) {
        try {
            $worker = new $workerClassname();
            $worker->start($argv);
        } catch (Throwable $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}

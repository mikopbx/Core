<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\System\{BeanstalkClient, System, Util};
use Error;
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


    private bool $needRestart = false;

    /**
     * @param $argv
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient();
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->subscribe(__CLASS__, [$this, 'prepareAnswer']);

        $this->registerProcessors();

        while ($this->needRestart === false) {
            try {
                $client->wait();
            } catch (\Error $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
            }
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
            'files'  => FilesManagementProcessor::class,
            'modules' => PbxExtensionsProcessor::class
        ];
    }

    /**
     * Process API request from frontend
     *
     * @param BeanstalkClient $message
     *
     * @throws \JsonException
     */
    public function prepareAnswer(BeanstalkClient $message): void
    {
        try {
            $request   = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $processor = $request['processor'];

            if (array_key_exists($processor, $this->processors)) {
                $res = $this->processors[$processor]::callback($request);
            } else {
                $res             = new PBXApiResult();
                $res->processor  = __METHOD__;
                $res->success    = false;
                $res->messages[] = "Unknown processor - {$processor} in prepareAnswer";
            }
        } catch (Error $exception) {
            $res             = new PBXApiResult();
            $res->processor  = __METHOD__;
            $res->messages[] = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
        }
        $message->reply(json_encode($res->getResult(), JSON_THROW_ON_ERROR));
        $this->checkNeedReload($res->data);
    }

    /**
     * Checks if the module or worker needs to be reloaded.
     *
     * @param array $data
     */
    private function checkNeedReload(array $data): void
    {
        // Check if new code added from modules
        $needRestartWorkers = $data['needRestartWorkers'] ?? false;
        if ($needRestartWorkers) {
            System::restartAllWorkers();
            $this->needRestart = true;
        }
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
        } catch (\Error $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}

<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\System\{BeanstalkClient, Configs\NginxConf, Configs\PHPConf, System, Util};
use Error;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\AdvicesProcessor;
use MikoPBX\PBXCoreREST\Lib\CdrDBProcessor;
use MikoPBX\PBXCoreREST\Lib\IAXStackProcessor;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
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
     * Modules can expose additional REST methods and processors,
     * look at src/Modules/Config/RestAPIConfigInterface.php
     */
    private array $additionalProcessors;

    private bool $needRestart = false;
    /**
     * Максимаольное кол-во запущенных процессов.
     * @var int
     */
    protected int $maxProc=1;

    /**
     * @param $argv
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient();
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->subscribe(__CLASS__, [$this, 'prepareAnswer']);

        $this->registerModulesProcessors();

        while ($this->needRestart===false) {
            try {
                $client->wait();
            } catch (\Error $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
            }
        }
    }

    /**
     * Every module config class can process requests under root rights,
     * if it described in Config class
     */
    private function registerModulesProcessors():void
    {
        $additionalModules          = $this->di->getShared('pbxConfModules');
        $this->additionalProcessors = [];
        foreach ($additionalModules as $moduleConfigObject) {
            if ($moduleConfigObject->moduleUniqueId !== 'InternalConfigModule'
                && method_exists($moduleConfigObject, 'moduleRestAPICallback')
            ) {
                $this->additionalProcessors[] = [
                    $moduleConfigObject->moduleUniqueId,
                    $moduleConfigObject,
                    'moduleRestAPICallback',
                ];
            }
        }
    }

    /**
     * Process API request from frontend
     *
     * @param BeanstalkClient $message
     */
    public function prepareAnswer($message): void
    {
        try {
            $request   = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $processor = $request['processor'];

            switch ($processor) {
                case 'advices':
                    $res = AdvicesProcessor::advicesCallBack($request);
                    break;
                case 'cdr':
                    $res = CdrDBProcessor::cdrCallBack($request);
                    break;
                case 'sip':
                    $res = SIPStackProcessor::sipCallBack($request);
                    break;
                case 'iax':
                    $res = IAXStackProcessor::iaxCallBack($request);
                    break;
                case 'system':
                    $res = SystemManagementProcessor::systemCallBack($request);
                    break;
                case 'syslog':
                    $res = SysLogsManagementProcessor::syslogCallBack($request);
                    break;
                case 'sysinfo':
                    $res = SysinfoManagementProcessor::sysinfoCallBack($request);
                    break;
                case 'storage':
                    $res = StorageManagementProcessor::storageCallBack($request);
                    break;
                case 'upload':
                    $res = FilesManagementProcessor::uploadCallBack($request);
                    break;
                case 'license':
                    $res = LicenseManagementProcessor::licenseCallBack($request);
                    break;
                case 'modules':
                    $res = $this->modulesCallBack($request);
                    break;
                default:
                    $res             = new PBXApiResult();
                    $res->processor = __METHOD__;
                    $res->success    = false;
                    $res->messages[] = "Unknown processor - {$processor} in prepareAnswer";
            }
        } catch (Error $exception) {
            $res             = new PBXApiResult();
            $res->processor = __METHOD__;
            $res->messages[] = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
        }

        $message->reply(json_encode($res->getResult()));

        // Перезапускаем web сервер.
        $needReloadWWW = $res->data['needReloadWWW']??false;
        if ($needReloadWWW === true) {
            $nginxConf = new NginxConf();
            // Необходимо перезапустить php-fpm
            $phpConf = new PHPConf();
            $phpConf->reStart();
            // Перезапускаем nginx
            $nginxConf->reStart();
            // Перезапускаем текущий процесс (отложенно).
            $this->needRestart=true;
        }

        // Check if modules change state
        if (is_array($res->data)
            && array_key_exists('needReloadModules', $res->data)
            && $res->data['needReloadModules']
        ) {
            $this->registerModulesProcessors();
        }

        // Check if new code added from modules
        if (is_array($res->data)
            && array_key_exists('needRestartWorkers', $res->data)
            && $res->data['needRestartWorkers']
        ) {
            System::restartAllWorkers();
            $this->needRestart=true;
        }
    }


    /**
     * Processes modules API requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function modulesCallBack(array $request): PBXApiResult
    {
        clearstatcache();

        $action = $request['action'];
        $module = $request['module'];

        $res             = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->messages[] = "Unknown action - {$action} in modulesCallBack";
        $res->function   = $action;

        // Try process request over additional modules
        foreach ($this->additionalProcessors as [$moduleUniqueId, $moduleConfigObject, $callBack]) {
            if (stripos($module, $moduleUniqueId) === 0) {
                $res = $moduleConfigObject->$callBack($request);
                break;
            }
        }

        return $res;
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

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

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\System\{BeanstalkClient, Processes, Util};
use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
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


/**
 * The WorkerApiCommands class is responsible for handling API command requests from the frontend.
 *
 * It handles API command requests, delegates the processing to the appropriate processor classes,
 * and checks for restart requirements based on the received requests.
 *
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerApiCommands extends WorkerBase
{
    /**
     * The maximum parallel worker processes
     *
     * @var int
     */
    public int $maxProc = 2;


    /**
     * Starts the worker.
     *
     * @param array $argv The command line arguments.
     *
     * @return void
     */
    public function start($argv): void
    {
        /** @var BeanstalkConnectionWorkerApiProvider $beanstalk */
        $beanstalk = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        if($beanstalk->isConnected() === false){
            Util::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }
        $beanstalk->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $beanstalk->subscribe(__CLASS__, [$this, 'prepareAnswer']);

        while ($this->needRestart === false) {
            $beanstalk->wait();
        }
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

            // Old style, we can remove it in 2025
            if ($processor === 'modules'){
                $processor = PbxExtensionsProcessor::class;
            }

            if (method_exists($processor, 'callback')) {
                $res = $processor::callback($request);
            } else {
                $res->success    = false;
                $res->messages[] = "Unknown processor - {$processor} in prepareAnswer";
            }
        } catch (Throwable $exception) {
            $res->messages[] = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
            $request        = [];
        } finally {
            $message->reply(json_encode($res->getResult()));
            if ($res->success) {
                $this->checkNeedReload($request);
            }
        }

    }

    /**
     * Checks if the module or worker needs to be reloaded.
     *
     * @param array $request
     */
    private function checkNeedReload(array $request): void
    {
        // Check if new code added from modules
        $restartActions = $this->getNeedRestartActions();
        foreach ($restartActions as $processor => $actions) {
            foreach ($actions as $action) {
                if ($processor === $request['processor']
                    && $action === $request['action']) {
                    $this->needRestart = true;
                    Processes::restartAllWorkers();
                    return;
                }
            }
        }
    }

    /**
     * Prepares array of processor => action depends restart this kind worker
     *
     * @return array
     */
    private function getNeedRestartActions(): array
    {
        return [
            SystemManagementProcessor::class  => [
                 'enableModule',
                 'disableModule',
                 'uninstallModule',
                 'restoreDefaultSettings',
            ],
        ];
    }

}

// Start worker process
WorkerApiCommands::startWorker($argv??[]);
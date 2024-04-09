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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\Core\System\{BeanstalkClient, Configs\BeanstalkConf, Processes, SystemMessages};
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use Throwable;
use function xdebug_break;

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
    public int $maxProc = 4;


    /**
     * Starts the worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @return void
     */
    public function start(array $argv): void
    {
        /** @var BeanstalkConnectionWorkerApiProvider $beanstalk */
        $beanstalk = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        if ($beanstalk->isConnected() === false) {
            SystemMessages::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
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
        // Use fork to run the callback in a separate process
        $pid = pcntl_fork();
        if ($pid === -1) {
            // Fork failed
            throw new \RuntimeException("Failed to fork a new process.");
        }
        if ($pid === 0) {
            $res = new PBXApiResult();
            $res->processor = __METHOD__;
            $async = false;
            try {
                $request = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
                $async   = ($request['async']??false) === true;
                $processor = $request['processor'];
                $res->processor = $processor;
                // Old style, we can remove it in 2025
                if ($processor === 'modules') {
                    $processor = PbxExtensionsProcessor::class;
                }
                // Start xdebug session, don't forget to install xdebug.remote_mode = jit on xdebug.ini
                // and set XDEBUG_SESSION Cookie header on REST request to debug it
                if (isset($request['debug']) && $request['debug'] === true && extension_loaded('xdebug')) {
                    xdebug_break();
                }

                // This is the child process
                if (method_exists($processor, 'callback')) {

                    cli_set_process_title(__CLASS__.'-'.$request['action']);
                    // Execute async job
                    if ($async) {
                        $res->success = true;
                        $res->messages['info'][] = "The async job {$request['action']} starts in background, you will receive answer on {$request['asyncChannelId']} nchan channel";
                        $encodedResult = json_encode($res->getResult());
                        $message->reply($encodedResult);
                        $processor::callback($request);
                    } else {
                        $res = $processor::callback($request);
                    }
                } else {
                    $res->success = false;
                    $res->messages['error'][] = "Unknown processor - {$processor} in prepareAnswer";
                }
            } catch (Throwable $exception) {
                $request = [];
                $this->needRestart = true;
                // Prepare answer with pretty error description
                $res->messages['error'][] = CriticalErrorsHandler::handleExceptionWithSyslog($exception);
            } finally {
                if ($async === false) {
                    $encodedResult = json_encode($res->getResult());
                    if ($encodedResult === false) {
                        $res->data = [];
                        $res->messages['error'][] = 'It is impossible to encode to json current processor answer';
                        $encodedResult = json_encode($res->getResult());
                    }

                    // Check the response size and write in on file if it bigger than Beanstalk can digest
                    if (strlen($encodedResult) > BeanstalkConf::JOB_DATA_SIZE_LIMIT) {
                        $dirsConfig = $this->di->getShared('config');
                        $filenameTmp = $dirsConfig->path('www.downloadCacheDir') . '/temp-' . __FUNCTION__ . '_' . microtime() . '.data';
                        if (file_put_contents($filenameTmp, serialize($res->getResult()))) {
                            $encodedResult = json_encode([BeanstalkClient::RESPONSE_IN_FILE => $filenameTmp]);
                        } else {
                            $res->data = [];
                            $res->messages['error'][] = 'It is impossible to write answer into file ' . $filenameTmp;
                            $encodedResult = json_encode($res->getResult());
                        }
                    }
                    $message->reply($encodedResult);
                }
                if ($res->success) {
                    $this->checkNeedReload($request);
                }
            }
            exit(0); // Exit the child process
        }
        // This is the parent process
        pcntl_wait($status); // Wait for the child process to complete
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
            SystemManagementProcessor::class => [
                'restoreDefault',
            ],
            ModulesManagementProcessor::class => [
                'enableModule',
                'disableModule',
                'uninstallModule',
            ],
        ];
    }
}

// Start worker process
WorkerApiCommands::startWorker($argv ?? []);
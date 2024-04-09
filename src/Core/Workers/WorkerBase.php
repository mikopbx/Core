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

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Text;
use Throwable;

/**
 * Base class for workers. This class is responsible for basic worker management and
 * includes methods for handling signals, saving PID files, and managing worker processes.
 *
 * @package MikoPBX\Core\Workers
 */
abstract class WorkerBase extends Di\Injectable implements WorkerInterface
{
    /**
     * Maximum number of processes that can be created.
     *
     * @var int
     */
    public int $maxProc = 1;

    /**
     * Instance of the Asterisk Manager.
     *
     * @var AsteriskManager
     */
    protected AsteriskManager $am;

    /**
     * Flag indicating whether the worker needs to be restarted.
     *
     * @var bool
     */
    protected bool $needRestart = false;

    /**
     * Time the worker started.
     *
     * @var float
     */
    protected float $workerStartTime;

    /**
     * Constructs a WorkerBase instance.
     *
     * It is declared as final to prevent overriding in child classes.
     * Any additional initialization required in child classes should be done in the start() method.
     *
     * @return void
     */
    final public function __construct()
    {
        pcntl_async_signals(true);
        pcntl_signal(
            SIGUSR1,
            [$this, 'signalHandler'],
            true
        );
        register_shutdown_function([$this, 'shutdownHandler']);
        $this->workerStartTime = floatval(microtime(true));
        $this->savePidFile();
    }

    /**
     * Save PID to a file.
     *
     * @return void
     */
    private function savePidFile(): void
    {
        $activeProcesses = Processes::getPidOfProcess(static::class);
        $processes = explode(' ', $activeProcesses);
        if (count($processes) === 1) {
            file_put_contents($this->getPidFile(), $activeProcesses);
        } else {
            $pidFilesDir = dirname($this->getPidFile());
            $baseName = (string)pathinfo($this->getPidFile(), PATHINFO_BASENAME);
            $pidFile = $pidFilesDir . '/' . $baseName;
            // Delete old PID files
            $rm = Util::which('rm');
            Processes::mwExec("{$rm} -rf {$pidFile}*");
            $i = 1;
            foreach ($processes as $process) {
                file_put_contents("{$pidFile}-{$i}.pid", $process);
                $i++;
            }
        }
    }

    /**
     * Generate the PID file path for the worker.
     *
     * @return string The path to the PID file.
     */
    public function getPidFile(): string
    {
        $name = str_replace("\\", '-', static::class);

        return "/var/run/{$name}.pid";
    }

    /**
     * Starts the worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @param bool $setProcName Flag to set the process name. Default is true.
     *
     * @return void
     */
    public static function startWorker(array $argv, bool $setProcName = true): void
    {
        // The action command parsed from command-line arguments
        $action = $argv[1] ?? '';
        if ($action === 'start') {

            // Get the class name of the worker
            $workerClassname = static::class;

            // Set process title if the flag is set to true
            if ($setProcName) {
                cli_set_process_title($workerClassname);
            }
            try {
                // Create a new worker instance and start it
                $worker = new $workerClassname();
                $worker->start($argv);
                SystemMessages::sysLogMsg($workerClassname, "Normal exit after start ended", LOG_DEBUG);
            } catch (Throwable $e) {
                // Handle exceptions, log error messages, and pause execution
                CriticalErrorsHandler::handleExceptionWithSyslog($e);

                // Pause execution for 1 second
                sleep(1);
            }
        }
    }

    /**
     * Handles the received signal.
     *
     * @param int $signal The signal to handle.
     *
     * @return void
     */
    public function signalHandler(int $signal): void
    {
        $processTitle = cli_get_process_title();
        SystemMessages::sysLogMsg($processTitle, "Receive signal to restart  " . $signal, LOG_DEBUG);
        $this->needRestart = true;
    }

    /**
     * Handles the shutdown event.
     *
     * @return void
     */
    public function shutdownHandler(): void
    {
        $timeElapsedSecs = round(microtime(true) - $this->workerStartTime, 2);
        $processTitle = cli_get_process_title();
        $e = error_get_last();
        if ($e === null) {
            SystemMessages::sysLogMsg($processTitle, "shutdownHandler after {$timeElapsedSecs} seconds", LOG_DEBUG);
        } else {
            $details = implode(PHP_EOL,$e);
            SystemMessages::sysLogMsg(
                $processTitle,
                "shutdownHandler after {$timeElapsedSecs} seconds with error: {$details}",
                LOG_DEBUG
            );
        }
    }

    /**
     * Callback for the ping to keep the connection alive.
     *
     * @param BeanstalkClient $message The received message.
     *
     * @return void
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        $processTitle = cli_get_process_title();
        SystemMessages::sysLogMsg(
            $processTitle,
            "pingCallBack on ".__CLASS__." with message: ".json_encode($message->getBody()),
            LOG_DEBUG
        );
        $message->reply(json_encode($message->getBody() . ':pong'));
    }

    /**
     * Replies to a ping request from the worker.
     *
     * @param array $parameters The parameters of the request.
     *
     * @return bool True if the ping request was processed, false otherwise.
     */
    public function replyOnPingRequest(array $parameters): bool
    {
        $pingTube = $this->makePingTubeName(static::class);
        if ($pingTube === $parameters['UserEvent']) {
            $this->am->UserEvent("{$pingTube}Pong", []);

            return true;
        }

        return false;
    }

    /**
     * Generates the name for the ping tube based on the class name.
     *
     * @param string $workerClassName The class name of the worker.
     *
     * @return string The generated ping tube name.
     */
    public function makePingTubeName(string $workerClassName): string
    {
        return Text::camelize("ping_{$workerClassName}", '\\');
    }

    /**
     * The destructor for the WorkerBase class.
     *
     * @return void
     */
    public function __destruct()
    {
        $this->savePidFile();
    }
}
<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\Workers;

use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di;
use Phalcon\Text;

abstract class WorkerBase extends Di\Injectable implements WorkerInterface
{
    public int $currentProcId = 1;
    protected AsteriskManager $am;
    protected int $maxProc = 1;
    protected bool $needRestart = false;

    /**
     * Workers shared constructor
     */
    public function __construct()
    {
        pcntl_async_signals(true);
        pcntl_signal(
            SIGUSR1,
            [$this, 'signalHandler']
        );

        $this->checkCountProcesses();
        $this->savePidFile();
    }

    /**
     * Calculates how many processes have started already and kill excess or old processes
     */
    private function checkCountProcesses(): void
    {
        //TODO:: Мешает отладке, позже включу

        // $activeAnotherProcesses = Processes::getPidOfProcess(static::class, getmypid());
        // $processes              = explode(' ', $activeAnotherProcesses);
        // if (empty($processes[0])) {
        //     array_shift($processes);
        // }
        // $countProc = count($processes) + 1;
        // $killApp   = Util::which('kill');
        // if ($this->maxProc === 1 && $countProc > 1) {
        //     // Kill old processes with timeout, maybe it is soft restart and worker die without any help
        //     Processes::mwExec("{$killApp} SIGUSR1 {$activeAnotherProcesses}");
        // } elseif ($this->maxProc > $countProc) {
        //     // Start additional processes
        //     while ($countProc < $this->maxProc) {
        //         sleep(3);
        //         Processes::processPHPWorker(static::class, 'start', 'multiStart');
        //         $countProc++;
        //     }
        // } elseif ($this->maxProc < $countProc) {
        //     // Получим количество лишних процессов.
        //     $countProc4Kill = $countProc - $this->maxProc;
        //     // Завершим лишние
        //     while ($countProc4Kill >= 0) {
        //         if ( ! isset($processes[$countProc4Kill])) {
        //             break;
        //         }
        //         // Kill old processes with timeout, maybe it is soft restart and worker die without any help
        //         Processes::mwExec("{$killApp} SIGUSR1 {$processes[$countProc4Kill]}");
        //         $countProc4Kill--;
        //     }
        // }
    }

    /**
     * Saves pid to pidfile
     */
    private function savePidFile(): void
    {
        $activeProcesses = Processes::getPidOfProcess(static::class);
        $processes       = explode(' ', $activeProcesses);
        if (count($processes) === 1) {
            file_put_contents($this->getPidFile(), $activeProcesses);
        } else {
            $pidFilesDir = dirname($this->getPidFile());
            $pidFile     = $pidFilesDir . '/' . pathinfo($this->getPidFile(), PATHINFO_BASENAME);
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
     * Create PID file for worker
     */
    public function getPidFile(): string
    {
        $name = str_replace("\\", '-', static::class);

        return "/var/run/{$name}.pid";
    }

    /**
     * Process async system signal
     *
     */
    public function signalHandler($signal): void
    {
        $this->needRestart = true;
    }

    /**
     * Ping callback for keep alive check
     *
     * @param BeanstalkClient $message
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        $message->reply(json_encode($message->getBody() . ':pong'));
    }

    /**
     * If it was Ping request to check worker, we answer Pong and return True
     *
     * @param $parameters
     *
     * @return bool
     */
    public function replyOnPingRequest($parameters): bool
    {
        $pingTube = $this->makePingTubeName(static::class);
        if ($pingTube === $parameters['UserEvent']) {
            $this->am->UserEvent("{$pingTube}Pong", []);

            return true;
        }

        return false;
    }

    /**
     * Makes ping tube from classname and ping word
     *
     * @param string $workerClassName
     *
     * @return string
     */
    public function makePingTubeName(string $workerClassName): string
    {
        return Text::camelize("ping_{$workerClassName}", '\\');
    }

    /**
     * Deletes old PID files
     */
    public function __destruct()
    {
        $pidFilesDir = dirname($this->getPidFile());
        $pidFile     = $pidFilesDir . '/' . pathinfo($this->getPidFile(), PATHINFO_BASENAME);
        // Delete old PID files
        $rm = Util::which('rm');
        Processes::mwExec("{$rm} -rf {$pidFile}*");
    }
}
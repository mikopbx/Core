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
    protected AsteriskManager $am;
    public int $maxProc = 1;
    protected bool $needRestart = false;

    /**
     * Workers shared constructor
     * Do not remove FINAL there, use START function to add something
     */
    final public function __construct()
    {
        pcntl_async_signals(true);
        pcntl_signal(
            SIGUSR1,
            [$this, 'signalHandler']
        );

        $this->savePidFile();
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
    public function signalHandler(): void
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
        $this->savePidFile();
    }
}
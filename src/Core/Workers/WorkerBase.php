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
use Phalcon\Di;
use Phalcon\Text;

abstract class WorkerBase extends Di\Injectable implements WorkerInterface
{
    public int $currentProcId = 1;
    protected AsteriskManager $am;
    protected int $maxProc = 1;

    /**
     * Workers shared constructor
     */
    public function __construct()
    {
        $this->checkCountProcesses();
        $this->savePidFile();
    }

    /**
     * Calculates how many processes have started already and kill excess or old processes
     */
    private function checkCountProcesses(): void
    {
        $activeProcesses = Util::getPidOfProcess(static::class, getmypid());
        if ($this->maxProc === 1) {
            if ( ! empty($activeProcesses)) {
                $killApp = Util::which('kill');
                // Завершаем старый процесс.
                Util::mwExec("{$killApp} {$activeProcesses}");
            }
        } elseif ($this->maxProc > 1) {
            // Лимит процессов может быть превышен. Удаление лишних процессов.
            $processes = explode(' ', $activeProcesses);

            // Запустим нехдостающие процессы
            $countProc = count($processes);
            while ($countProc < $this->maxProc) {
                Util::processPHPWorker(static::class, 'start', 'multiStart');
                $countProc++;
            }
            // Получим количество лишних процессов.
            $countProc = count($processes) - $this->maxProc;
            $killApp   = Util::which('kill');
            // Завершим лишние
            while ($countProc >= 0) {
                if ( ! isset($processes[$countProc])) {
                    break;
                }
                // Завершаем старый процесс.
                Util::mwExec("{$killApp} {$processes[$countProc]}");
                $countProc--;
            }
        }
    }

    /**
     * Saves pid to pidfile
     */
    private function savePidFile(): void
    {
        $activeProcesses = Util::getPidOfProcess(static::class);
        $processes       = explode(' ', $activeProcesses);
        if (count($processes) === 1) {
            file_put_contents($this->getPidFile(), $activeProcesses);
        } else {
            $pidFilesDir = dirname($this->getPidFile());
            $pidFile = $pidFilesDir.'/'.pathinfo($this->getPidFile(), PATHINFO_BASENAME);
            // Delete old PID files
            $rm = Util::which('rm');
            Util::mwExec("{$rm} -rf {$pidFile}*");
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
        $pidFile = $pidFilesDir.'/'.pathinfo($this->getPidFile(), PATHINFO_BASENAME);
        // Delete old PID files
        $rm = Util::which('rm');
        Util::mwExec("{$rm} -rf {$pidFile}*");
    }
}
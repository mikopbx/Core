<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, Util};
use MikoPBX\Core\Asterisk\AsteriskManager;
use Throwable;

class WorkerAmiListener extends WorkerBase
{
    protected BeanstalkClient $client;

    protected AsteriskManager $am;

    /**
     * Установка фильтра
     *
     * @return array
     */
    private function setFilter(): array
    {
        $params = ['Operation' => 'Add', 'Filter' => 'Event: UserEvent'];

        return $this->am->sendRequestTimeout('Filter', $params);
    }

    /**
     * Старт работы листнера.
     *
     * @param $argv
     */
    public function start($argv): void
    {
        $this->client = new BeanstalkClient(WorkerCallEvents::class);
        $this->am     = Util::getAstManager();
        $this->setFilter();

        $this->am->addEventHandler("userevent", [$this, "callback"]);
        while ($this->needRestart === false) {
            $result = $this->am->waitUserEvent(true);
            if ($result === []) {
                // Нужен реконнект.
                usleep(100000);
                $this->am = Util::getAstManager();
                $this->setFilter();
            }
        }
    }

    /**
     * Функция обработки оповещений.
     *
     * @param $parameters
     */
    public function callback($parameters): void
    {
        if ($this->replyOnPingRequest($parameters)){
           return;
        }

        if ('CdrConnector' !== $parameters['UserEvent']) {
            return;
        }

        $result = base64_decode($parameters['AgiData']);
        $this->actionSendToBeanstalk($result);
    }

    /**
     * Отправка данных на сервер очередей.
     *
     * @param string $result - данные в ормате json для отправки.
     */
    private function actionSendToBeanstalk(string $result): void
    {
        $message_is_sent = false;
        $error           = '';
        for ($i = 1; $i <= 10; $i++) {
            try {
                $result_send = $this->client->publish($result);
                if ($result_send === false) {
                    $this->client->reconnect();
                }
                $message_is_sent = ($result_send !== false);
                if ($message_is_sent === true) {
                    // Проверка
                    break;
                }
            } catch (Throwable $e) {
                $this->client = new BeanstalkClient(WorkerCallEvents::class);
                $error        = $e->getMessage();
            }
        }

        if ($message_is_sent === false) {
            Util::sysLogMsg(__METHOD__, "Error send data to queue. " . $error, LOG_ERR);
        }
        // Логируем оповещение.
        Util::logMsgDb('WorkerCallEvents::class', json_decode($result, true));
    }

}


// Start worker process
$workerClassname = WorkerAmiListener::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
        Util::sysLogMsg($workerClassname, "Normal exit after start ended", LOG_DEBUG);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
    }
}



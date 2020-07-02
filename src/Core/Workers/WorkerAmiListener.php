<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, Util};
use Exception as ExceptionAlias;
use AGI_AsteriskManager;

class WorkerAmiListener extends WorkerBase
{
    protected $client;

    protected AGI_AsteriskManager $am;

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
        while (true) {
            $result = $this->am->waitUserEvent(true);
            if ($result == false) {
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
    private function actionSendToBeanstalk($result): void
    {
        $message_is_sent = false;
        $error           = '';
        for ($i = 1; $i <= 10; $i++) {
            try {
                $result_send = $this->client->publish($result);
                if ($result_send == false) {
                    $this->client->reconnect();
                }
                $message_is_sent = ($result_send !== false);
                if ($message_is_sent == true) {
                    // Проверка
                    break;
                }
            } catch (ExceptionAlias $e) {
                $this->client = new BeanstalkClient(WorkerCallEvents::class);
                $error        = $e->getMessage();
            }
        }

        if ($message_is_sent == false) {
            Util::sysLogMsg('CDR_AMI_Connector', "Error send data to queue. " . $error);
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
    } catch (ExceptionAlias $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}



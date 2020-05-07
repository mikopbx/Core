<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Workers;

require_once 'globals.php';

use Phalcon\Exception;
use MikoPBX\Core\System\{BeanstalkClient, Util};

class WorkerAmiListener extends WorkerBase
{
    private $client;
    private $am;
    private $message_is_sent;

    /**
     * WorkerAmiListener constructor.
     *
     * @throws Exception
     */
    function __construct()
    {
        parent::__construct();
        $this->client = new BeanstalkClient(WorkerCallEvents::class);
        $this->am     = Util::getAstManager();
        $this->setFilter();
    }

    /**
     * Старт работы листнера.
     */
    public function start()
    {
        $this->am->addEventHandler("userevent", [$this, "callback"]);
        while (true) {
            $result = $this->am->wait_user_event(true);
            if ($result == false) {
                // Нужен реконнект.
                usleep(100000);
                $this->am = Util::getAstManager();
                $this->setFilter();
            }
        }
    }

    /**
     * Установка фильтра
     *
     * @return array
     */
    private function setFilter()
    {
        $params = ['Operation' => 'Add', 'Filter' => 'Event: UserEvent'];
        $res    = $this->am->sendRequestTimeout('Filter', $params);

        return $res;
    }

    /**
     * Функция обработки оповещений.
     *
     * @param $parameters
     */
    public function callback($parameters)
    {
        if ('CdrConnectorPing' == $parameters['UserEvent']) {
            usleep(50000);
            $this->am->UserEvent("CdrConnectorPong", []);

            return;
        }
        if ('CdrConnector' != $parameters['UserEvent']) {
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
    private function actionSendToBeanstalk($result)
    {

        $this->message_is_sent = false;
        $error                 = '';
        for ($i = 1; $i <= 10; $i++) {
            try {
                $result_send = $this->client->publish($result);
                if ($result_send == false) {
                    $this->client->reconnect();
                }
                $this->message_is_sent = ($result_send !== false);
                if ($this->message_is_sent == true) {
                    // Проверка
                    break;
                }
            } catch (Exception $e) {
                $this->client = new BeanstalkClient(WorkerCallEvents::class);
                $error        = $e->getMessage();
            }
        }

        if ($this->message_is_sent == false) {
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
        $worker->start();
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}



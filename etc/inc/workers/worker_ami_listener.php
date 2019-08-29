<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2019
 */
require_once 'globals.php';

class worker_ami_listener {
    private $client;
    private $am;
    private $message_is_sent;

    /**
     * worker_ami_listener constructor.
     * @throws Exception
     */
    function __construct(){
        $this->client = new BeanstalkClient('call_events');
        $this->am     = Util::get_am();
        $this->set_filter();
    }

    /**
     * Отправка данных на сервер очередей.
     * @param string $result - данные в ормате json для отправки.
     */
    private function Action_SendToBeanstalk($result){

        $this->message_is_sent = false; $error ='';
        for ($i = 1; $i <= 10; $i++) {
            try{
                $result_send = $this->client->publish($result);
                if($result_send == false){
                    $this->client->reconnect();
                }
                $this->message_is_sent = ($result_send !== false);
                if($this->message_is_sent == true){
                    // Проверка
                    break;
                }
            }catch (Exception $e){
                $this->client = new BeanstalkClient('call_events');
                $error = $e->getMessage();
            }
        }

        if($this->message_is_sent == false){
            Util::sys_log_msg('CDR_AMI_Connector', "Error send data to queue. ".$error);
        }
        // Логируем оповещение.
        Util::log_msg_db('call_events', json_decode($result, true));
    }

    /**
     * Функция обработки оповещений.
     * @param $parameters
     */
    public function callback($parameters){
        if('CdrConnectorPing' == $parameters['UserEvent']){
            usleep(50000);
            $this->am->UserEvent("CdrConnectorPong", []);
            return;
        }
        if('CdrConnector' != $parameters['UserEvent']){
            return;
        }

        $result = base64_decode($parameters['AgiData']);
        $this->Action_SendToBeanstalk($result);
    }

    /**
     * Старт работы листнера.
     */
    public function start(){
        $this->am->add_event_handler("userevent", [$this, "callback"]);
        while (true) {
            $result = $this->am->wait_user_event(true);
            if($result == false){
                // Нужен реконнект.
                usleep(100000);
                $this->am = Util::get_am();
                $this->set_filter();
            }
        }
    }

    /**
     * Установка фильтра
     * @return array
     */
    private function set_filter(){
        $params   = ['Operation'=>'Add', 'Filter' => 'Event: UserEvent'];
        $res 	  = $this->am->send_request_timeout('Filter', $params);
        return $res;
    }
}

if(count($argv)>1 && $argv[1] == 'start') {
    try{
        $listener = new worker_ami_listener();
    }catch (Exception $e) {
        Util::sys_log_msg("AMI_WORKER_EXCEPTION", $e->getMessage());
    }
    $listener->start();

}



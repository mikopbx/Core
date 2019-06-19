<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2019
 */

require_once 'globals.php';
require_once 'Nats/autoloader.php';

class Checker {
    private $client_nats;
    private $timeout = 8;
    private $result  = false;
    private $message = false;
    private $g;

    /**
     * Checker constructor.
     * @param $g
     * @throws Exception
     */
    function __construct($g){
        $this->g = &$g;
        $this->client_nats = new \Nats\Connection();
        $this->client_nats->connect($this->timeout);

        $this->wait_fully_booted();
    }

    public function callback($message) {
        $this->result = true;
        $this->message = $message;
    }

    /**
     * Ожидаем полной загрузки asterisk.
     */
    private function wait_fully_booted(){
        $time_start = microtime(true);

        $res_data = false;
        $out = [];
        while (true) {
            $result = \Util::mwexec("/usr/bin/timeout -t 1 /usr/sbin/asterisk -rx'core waitfullybooted'", $out);
            if($result == 0 && implode('', $out) == 'Asterisk has fully booted.'){
                $res_data = true;
                break;
            }
            $time = microtime(true) - $time_start;
            if($time > 60) {
                \Util::sys_log_msg('Safe Script', 'Error: Asterisk has not booted');
                break;
            }
        }
        return $res_data;
    }

    /**
     * Проверка работы worker.
     * @param $name
     * @throws \Nats\Exception
     */
    public function check_worker($name){
        if( !$this->client_nats->isConnected() === true ){
            $this->client_nats->reconnect();
        }
        $this->result = false;
        $WorkerPID = Util::get_pid_process($name);
        if("$WorkerPID" != ''){
            // Сервис запущен. Выполним к нему пинг.
            $this->client_nats->request("ping_{$name}", 'ping', [$this, 'callback']);
            if(false == $this->result){
                $this->start_worker($name);
            }
        }else{
            // Сервис вовсе не запущен.
            $this->start_worker($name);
        }
    }

    /**
     * Проверка работы сервиса через beanstalk.
     * @param $name
     * @throws Exception
     */
    public function check_worker_beanstalk($name){
        $this->result = false;
        $WorkerPID = Util::get_pid_process($name);
        if("$WorkerPID" != ''){
            // Сервис запущен. Выполним к нему пинг.
            $queue  = new BeanstalkClient("ping_{$name}");
            // Выполняем запрос с наибольшим приоритетом.
            $result = $queue->request('ping', 2, 0);
            if(false == $result){
               $this->start_worker($name);
            }
        }else{
            // Сервис вовсе не запущен.
            $this->start_worker($name);
        }
    }

    /**
     * Проверка работы AMI листнера.
     * @param $name  - имя сервиса
     * @param $level - уровень рекурсии
     */
    public function check_worker_ami($name, $level=0){
        $res_ping = FALSE;
        $WorkerPID = Util::get_pid_process($name);
        if("$WorkerPID" != '') {
            // Сервис запущен. Выполним к нему пинг.
            $am = Util::get_am();
            $res_ping = $am->ping_ami_listner();
            if (FALSE == $res_ping) {
                // Пинг не прошел.
                Util::sys_log_msg('AMI_listner', 'Restart...');
            }
        }

        if($res_ping == FALSE && $level<10){
            $this->start_worker($name, 'start');
            // Сервис не запущен.
            sleep(2);
            // Пытаемся снова запустить / проверить работу сервиса.
            $this->check_worker_ami($name, $level+1);
        }
    }

    /**
     * Запуск рабочего процесса.
     * @param        $name
     * @param string $param
     */
    private function start_worker($name, $param=''){
        \Util::restart_worker($name, $param);
    }
}

cli_set_process_title('worker_safe_script');
try{
    $cheker = new Checker($g);
    // Проверка листнера UserEvent
    $cheker->check_worker_ami('worker_ami_listener');
    // Проверяет, запускает при необходимости worker.
    $cheker->check_worker_beanstalk('worker_call_events');
    $cheker->check_worker('worker_api_commands');
    $cheker->check_worker('worker_lic');
    $cheker->check_worker_beanstalk('notify_by_email');
    $cheker->check_worker_beanstalk('notify_error');
}catch (Exception $e) {
    Util::sys_log_msg('Safe Script', 'Error '. $e->getMessage());
}

// Проверка критических проблем.
Mikopbx\Main::check_alert();

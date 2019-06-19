<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2019
 */

class BeanstalkClient {
    private $_host = '127.0.0.1';
    private $_port = '4229';
    private $queue = null;
    private $connected = false;
    private $job_options = [];
    private $subscriptions = [];
    private $tube = '';
    private $reconnectsCount = 0;
    private $message = null;

    function __construct($tube){
        $this->tube = "$tube";
        $connect_params = ['host' => $this->_host, 'port' => $this->_port, 'tube' => $tube];
        $this->queue = new Phalcon\Queue\Beanstalk($connect_params);
        $this->init_queue();

        $this->job_options = ['priority' => 250, 'delay' => 0, 'ttr' => 3600];

    }

    /**
     * Инициализация очереди.
     */
    public function init_queue(){
        try {
            $this->queue->connect();
            $this->queue->ignore('default');
            $this->queue->choose($this->tube);
            $this->queue->watch($this->tube);
            $this->connected = true;

            foreach ($this->subscriptions as $key => $subscription){
                $this->queue->watch($key);
            }

        } catch (Exception $e) {
            Util::sys_log_msg('Beanstalk', $e->getMessage());
        }
    }

    /**
     * Попытка подключения к серверу очередей.
     * @return bool
     */
    public function isConnected(){
        return $this->connected;
    }

    /**
     * Переподключение.
     * @param bool $is_error
     */
    public function reconnect($is_error = true){
        if($is_error == true){
            $this->init_queue();
            $this->reconnectsCount++;
        }else{
            $this->queue->disconnect();
            $this->queue->connect();
        }
    }

    /**
     * Отправить данные в очередь без получения ответа.
     * @param $job_data
     * @param $priority
     * @param null $tube
     * @return bool|int
     */
    public function publish($job_data, $priority = null, $tube = null){
        if(!empty($priority) && is_numeric($priority)){
            $this->job_options['priority'] = $priority;
        }
        if(!empty($tube) && $this->tube != $tube){
            $this->queue->choose($tube);
            $result = $this->queue->put($job_data, $this->job_options);
            $this->queue->choose($this->tube);
        }else{
            $result = $this->queue->put($job_data, $this->job_options);
        }

        return $result;
    }

    /**
     * Отпрвка запроса с ожиданием ответа.
     * @param      $job_data
     * @param int  $timeout
     * @param null $priority
     * @return bool|mixed
     */
    public function request($job_data, $timeout = 10, $priority = null){
        $this->message = false;
        if (!is_array($job_data)) {
            $job_data = [ 0 => $job_data ];
        }

        $inbox_tube = uniqid('INBOX_');
        $job_data['inbox_tube'] = $inbox_tube;
        // Отправляем данные для обработки.
        $id = $this->publish($job_data, $priority);

        // Меняем прослушиваемую очередь.
        $this->reconnect(false);
        $this->queue->choose($inbox_tube);
        $this->queue->watch($inbox_tube);

        // Получаем ответ от сервера.
        $job = $this->queue->reserve($timeout);
        if ($job !== false) {
            $this->message = $job->getBody();
            $job->delete();
        }
        $this->queue->choose($this->tube);

        // Проверим, не зависла ли задача. Удалим, не актуальна.
        $fail_job = $this->queue->jobPeek($id);
        if ($fail_job !== false) {
            // Задача не была обработана, завершаем.
            $fail_job->delete();
        }
        return $this->message;
    }

    /**
     * @param string $tube
     * @param array | callable $callback
     */
    public function subscribe($tube, $callback){
        $this->queue->watch("$tube");
        $this->subscriptions[$tube] = $callback;
    }

    /**
     * Ожидание и обработка jobs.
     */
    public function wait(){

        while (true) {
            $this->message = null;

            $start = microtime(true);
            $job = $this->queue->reserve(10);
            if($job == false){
                $worktime = (microtime(true) - $start);
                if($worktime < 0.5){
                    // Что то не то, вероятно потеряна связь с сервером очередей.
                    $this->init_queue();
                }
                continue;
            }

            $this->message = $job->getBody();
            $tube    = ( $job->stats() )['tube'];
            $func    = $this->subscriptions[$tube];

            if(is_array($func)){
                call_user_func($func, $this);
            } else if (is_callable($func) === true) {
                $func($this);
            }else{
                continue;
            }

            $job->delete();
        }

    }

    /**
     * Получение данных запроса.
     * @return string
     */
    public function getBody(){
        if(is_array($this->message) && isset($this->message['inbox_tube']) && count($this->message) == 2){
            // Это поступил request, треует ответа. Данные были переданы первым параметром массива.
            $message_data = $this->message[0];
        }else{
            $message_data = $this->message;
        }
        return $message_data;
    }

    /**
     * Отправка результата выполнения запроса.
     * @param $response
     */
    public function reply($response){
        if( isset($this->message['inbox_tube']) ){
            $this->queue->choose($this->message['inbox_tube']);
            $this->queue->put($response);
            $this->queue->choose($this->tube);
        }
    }

    /**
     * TODO // Обработка ошибок.
     * @param $err_handler
     */
    public function setErrorHendler($err_handler){

    }

    public function reconnectsCount(){
        return $this->reconnectsCount;
    }
}

if(!function_exists('yaml_parse')){
    function yaml_parse($input, $pos=0, $ndocs=0, $callbacks=NULL){

        unset($pos);
        unset($ndocs);
        unset($callbacks);

        $arr_result = [];
        $rows = explode("\n", $input);
        foreach ($rows as $row){
            $row_data = explode(":", $row);
            if(count($row_data) == 2){
                $arr_result[trim($row_data[0])] = trim($row_data[1]);
            }
        }
        return $arr_result;
    }
}
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 1 2020
 */

require_once 'globals.php';

class notify_error {
    private $queue          = [];
    private $starting_point = 0;
    private $interval       = 28800;

    /**
     * Обработчик пинга. Тут же проверка необходимости оповещения.
     * @param BeanstalkClient $message
     */
    public function ping_worker($message) {

        $message->reply(json_encode($message->getBody().':pong'));
        if(count($this->queue)>0 && (time() - $this->starting_point)>$this->interval){
            $this->send_notify();
            $this->starting_point = time();
            $this->queue = [];
        }
    }

    /**
     * @param BeanstalkClient $message$message
     */
    public function on_license_error($message) {
        $body = $message->getBody();
        if(empty($body)){
            return;
        }
        // Наполняем массив уникальными даными.
        $this->queue[$body] = 'License error:';
    }

    /**
     * @param BeanstalkClient $message$message
     */
    public function on_storage_error($message) {
        $body = $message->getBody();
        if(empty($body)){
            return;
        }
        $mail_body = '';
        if(is_array($body)){
            foreach ($body as $key => $val){
                $mail_body .= "$key: $val <br>";
            }
        }else{
            $mail_body = trim($body);
        }
        // Наполняем массив уникальными даными.
        $this->queue[$mail_body] = 'Storage error:';
    }

    /**
     * Наполняем очередь уведомлениями.
     */
    public function start(){
        while (true) {
            try{
                $client  = new BeanstalkClient('notify_error_license');
                $client->subscribe('notify_error_license', [$this, 'on_license_error'] );
                $client->subscribe('notify_error_storage', [$this, 'on_storage_error'] );
                $client->subscribe('ping_notify_error',    [$this, 'ping_worker']);

                $client->wait();
            }catch (Exception $e){
                sleep(1);
            }
        }
    }

    /**
     * Отправка уведомления об ошибке лицензии.
     */
    private function send_notify(){
        $config = new Config();
        $to = $config->get_general_settings('SystemNotificationsEmail');
        if(empty($to)){
            return;
        }
        $test_email = '';
        foreach ($this->queue as $text_error => $section){
            if(empty($text_error)){
                continue;
            }
            if(Util::is_json($text_error)){
                $data = json_decode($text_error, true);
                $test_email.= "<hr>";
                $test_email.= "{$section}";
                $test_email.= "<hr>";
                foreach ($data as $key => $value){
                    $test_email.= "{$key}: {$value}<br>";
                }
                $test_email.= "<hr>";
            }else{
                $test_email.= "$text_error <br>";
            }
        }

        Notifications::send_mail($to, 'Askozia Errors', $test_email);
    }
}


$notifier = new notify_error();
$notifier->start();
<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\System;

use Phalcon\Di;
use Phalcon\Di\Injectable;
use Pheanstalk\Job;
use Pheanstalk\Pheanstalk;

class BeanstalkClient extends Injectable
{
    /** @var Pheanstalk */
    private Pheanstalk $queue;
    private bool $connected = false;
    private array $job_options;
    private array $subscriptions = [];
    private string $tube;
    private int $reconnectsCount = 0;
    private $message;
    private $timeout_handler;
    private $error_handler;

    private string $port;

    /**
     * BeanstalkClient constructor.
     *
     * @param string $tube
     * @param string $port
     */
    public function __construct($tube = 'default', $port = '')
    {
        $this->tube        = str_replace("\\", '-', $tube);;
        $this->job_options = ['priority' => 250, 'delay' => 0, 'ttr' => 3600];
        $this->port = $port;
        $this->reconnect();
    }

    public function reconnect(): void
    {
        $config = $this->di->get('config')->beanstalk;
        $port   = $config->port;
        if(!empty($this->port) && is_numeric($this->port)){
            $port = $this->port;
        }

        $this->queue = Pheanstalk::create($config->host, $port);
        $this->queue->useTube($this->tube);
        $this->connected = true;
    }

    /**
     * Попытка подключения к серверу очередей.
     *
     * @return bool
     */
    public function isConnected(): bool
    {
        return $this->connected;
    }

    /**
     * Отпрвка запроса с ожиданием ответа.
     *
     * @param      $job_data
     * @param int  $timeout
     * @param ?int $priority
     *
     * @return bool|mixed
     */
    public function request($job_data, $timeout = 10, $priority = null)
    {
        $this->message = false;
        $inbox_tube    = uniqid('INBOX_', true);
        $this->queue->watch($inbox_tube);

        // Отправляем данные для обработки.
        $requestMessage = [
            $job_data,
            'inbox_tube' => $inbox_tube,
        ];
        $this->publish($requestMessage, $priority);

        // Получаем ответ от сервера.
        $job = $this->queue->reserveWithTimeout($timeout);
        if ($job !== null) {
            $this->message = $job->getData();
            $this->queue->delete($job);
        }
        $this->queue->ignore($inbox_tube);

        // Чистим мусор.
        $this->cleanTube();
        return $this->message;
    }

    /**
     * Put a job in a beanstalkd server queue
     *
     * @param       $job_data
     * @param       $priority
     * @param ?string  $tube
     *
     * @return \Pheanstalk\Job
     */
    public function publish($job_data, $priority = null, $tube = null): Job
    {
        $tube = str_replace("\\", '-', $tube);
        // Change tube
        if ( ! empty($tube) && $this->tube !== $tube) {
            $this->queue->useTube($tube);
        }

        $job_data = serialize($job_data);
        // Send JOB to queue
        if (is_numeric($priority)) {
            $result = $this->queue->put($job_data, $priority);
        } else {
            $result = $this->queue->put($job_data);
        }

        // Return original tube
        $this->queue->useTube($this->tube);

        return $result;
    }

    /**
     * Subscribe on new message in tube
     *
     * @param string           $tube     - listening tube
     * @param array | callable $callback - worker
     */
    public function subscribe(string $tube, $callback): void
    {
        $tube = str_replace("\\", '-', $tube);
        $this->queue->watch($tube);
        $this->queue->ignore('default');
        $this->subscriptions[$tube] = $callback;
    }
    /**
     * Job worker
     *
     * @param int $timeout
     */
    public function wait($timeout = 10): void
    {
        $this->message = null;
        $start = microtime(true);
        $job   = $this->queue->reserveWithTimeout($timeout);
        if ($job === null) {
            $worktime = (microtime(true) - $start);
            if ($worktime < 0.5) {
                // Что то не то, вероятно потеряна связь с сервером очередей.
                $this->reconnect();
            }
            if (is_array($this->timeout_handler)) {
                call_user_func($this->timeout_handler);
            }
            return;
        }

        // Processing job over callable function attached in $this->subscribe
        if(json_decode($job->getData(), true) !==null){
            $mData =  $job->getData();
        }else{
            $mData = unserialize($job->getData(), [false]);
        }
        $this->message = $mData;

        $stats           = $this->queue->statsJob($job);
        $requestFormTube = $stats['tube'];
        $func            = $this->subscriptions[$requestFormTube] ?? null;

        if (is_array($func)) {
            call_user_func($func, $this);
        } elseif (is_callable($func) === true) {
            $func($this);
        } else {
            return;
        }
        $this->queue->delete($job);
    }

    /**
     * Получение данных запроса.
     *
     * @return string
     */
    public function getBody(): string
    {
        if (is_array($this->message)
            && isset($this->message['inbox_tube'])
            && count($this->message) === 2) {
            // Это поступил request, треует ответа. Данные были переданы первым параметром массива.
            $message_data = $this->message[0];
        } else {
            $message_data = $this->message;
        }

        return $message_data;
    }

    /**
     * Отправка результата выполнения запроса.
     *
     * @param $response
     */
    public function reply($response): void
    {
        if (isset($this->message['inbox_tube'])) {
            $this->queue->useTube($this->message['inbox_tube']);
            $this->queue->put($response);
            $this->queue->useTube($this->tube);
        }
    }

    /**
     *
     * @param $handler
     */
    public function setErrorHandler($handler): void
    {
        $this->error_handler = $handler;
    }

    /**
     * @param $handler
     */
    public function setTimeoutHandler($handler): void
    {
        $this->timeout_handler = $handler;
    }

    public function reconnectsCount(): int
    {
        return $this->reconnectsCount;
    }

    /**
     * Очистка зависших заданий.
     */
    public function cleanTube(){
        $tubes = $this->queue->listTubes();
        foreach ($tubes as $tube){
            if(strpos($tube, "INBOX_") !== 0){
                continue;
            }
            try {
                $statData = $this->queue->statsTube($tube)->getArrayCopy();
                $watching = $statData['current-watching'];
                if($watching !== '0'){
                    continue;
                }
                // Нужно удалить все Jobs.
                $this->queue->watch($tube);
                while (true){
                    $job = $this->queue->reserveWithTimeout(1);
                    if($job === null){
                        break;
                    }
                    $this->queue->delete($job);
                }
            }catch (\Pheanstalk\Exception\DeadlineSoonException $e){
                continue;
            }

        }
    }
}
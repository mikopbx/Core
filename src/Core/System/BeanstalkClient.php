<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\System;

use Phalcon\Di\Injectable;
use Pheanstalk\Contract\PheanstalkInterface;
use Pheanstalk\Job;
use Pheanstalk\Pheanstalk;
use Throwable;

class BeanstalkClient extends Injectable
{
    /** @var Pheanstalk */
    private Pheanstalk $queue;
    private bool $connected = false;
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
        $this->tube        = str_replace("\\", '-', $tube);
        $this->port        = $port;
        $this->reconnect();
    }

    /**
     * Recreates connection to the beanstalkd server
     */
    public function reconnect(): void
    {
        $config = $this->di->get('config')->beanstalk;
        $port   = $config->port;
        if ( ! empty($this->port) && is_numeric($this->port)) {
            $port = $this->port;
        }

        $this->queue = Pheanstalk::create($config->host, $port);
        $this->queue->useTube($this->tube);
        $this->connected = true;
    }

    /**
     * Returns connection status
     *
     * @return bool
     */
    public function isConnected(): bool
    {
        return $this->connected;
    }

    /**
     * Sends request and wait for answer from processor
     *
     * @param      $job_data
     * @param int  $timeout
     * @param int  $priority
     *
     * @return bool|mixed
     *
     */
    public function request(
        $job_data,
        int $timeout = 10,
        int $priority = PheanstalkInterface::DEFAULT_PRIORITY
    ) {
        $this->message = false;
        $inbox_tube    = uniqid('INBOX_', true);
        $this->queue->watch($inbox_tube);

        // Отправляем данные для обработки.
        $requestMessage = [
            $job_data,
            'inbox_tube' => $inbox_tube,
        ];
        $this->publish($requestMessage, null, $priority, 0, $timeout);

        // Получаем ответ от сервера.
        $job = null;
        try {
            $job = $this->queue->reserveWithTimeout($timeout);
            if ($job !== null) {
                $this->message = $job->getData();
                $this->queue->delete($job);
            }
        } catch (Throwable $exception){
            Util::sysLogMsg(__METHOD__, 'Exception: '.$exception->getMessage());
            if ($job !== null) {
                $this->queue->bury($job);
            }
        }
        $this->queue->ignore($inbox_tube);

        return $this->message;
    }

    /**
     * Puts a job in a beanstalkd server queue
     *
     * @param mixed   $job_data data to worker
     * @param ?string $tube     tube name
     * @param int     $priority Jobs with smaller priority values will be scheduled
     *                          before jobs with larger priorities. The most urgent priority is 0;
     *                          the least urgent priority is 4294967295.
     * @param int     $delay    delay before insert job into work query
     * @param int     $ttr      time to execute this job
     *
     * @return \Pheanstalk\Job
     */
    public function publish(
        $job_data,
        $tube = null,
        int $priority = PheanstalkInterface::DEFAULT_PRIORITY,
        int $delay = PheanstalkInterface::DEFAULT_DELAY,
        int $ttr = PheanstalkInterface::DEFAULT_TTR
    ): Job {
        $tube = str_replace("\\", '-', $tube);
        // Change tube
        if ( ! empty($tube) && $this->tube !== $tube) {
            $this->queue->useTube($tube);
        }
        $job_data = serialize($job_data);
        // Send JOB to queue
        $result = $this->queue->put($job_data, $priority, $delay, $ttr);

        // Return original tube
        $this->queue->useTube($this->tube);

        return $result;
    }

    /**
     * Drops orphaned tasks
     */
    public function cleanTubes()
    {
        $tubes = $this->queue->listTubes();
        foreach ($tubes as $tube) {
            try {
                $this->queue->useTube($tube);
                // Delete buried jobs
                while ($job = $this->queue->peekBuried()) {
                    $id = $job->getId();
                    $this->queue->delete($job);
                    Util::sysLogMsg(__METHOD__, "Deleted buried job with ID {$id} from {$tube}");
                }

                // Delete outdated jobs
                while ($job = $this->queue->peekReady()) {
                    $jobStats = $this->queue->statsJob($job);
                    $age = (int)($jobStats->age);
                    $expectedTimeToExecute = ((int)($jobStats->ttr))*2;
                    if ($age>$expectedTimeToExecute){
                        $id = $job->getId();
                        $this->queue->delete($job);
                        Util::sysLogMsg(__METHOD__, "Deleted outdated job with ID {$id} from {$tube}");
                    }
                }

            } catch (Throwable $exception){
                Util::sysLogMsg(__METHOD__, 'Exception: '.$exception->getMessage());
            }
        }
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
     * @param float $timeout
     *
     */
    public function wait(float $timeout = 10): void
    {
        $this->message = null;
        $start         = microtime(true);
        $job = null;
        try {
            $job  = $this->queue->reserveWithTimeout($timeout);
        } catch (Throwable $exception){
            Util::sysLogMsg(__METHOD__, 'Exception: '.$exception->getMessage());
        }

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
        if (json_decode($job->getData(), true) !== null) {
            $mData = $job->getData();
        } else {
            $mData = unserialize($job->getData(), [false]);
        }
        $this->message = $mData;

        $stats           = $this->queue->statsJob($job);
        $requestFormTube = $stats['tube'];
        $func            = $this->subscriptions[$requestFormTube] ?? null;

        if ($func===null){
            // Action not found
            $this->queue->bury($job);
        } else {
            try {
                if (is_array($func)) {
                    call_user_func($func, $this);
                } elseif (is_callable($func) === true) {
                    $func($this);
                }
                // Removes the job from the queue when it has been successfully completed
                $this->queue->delete($job);
            } catch (Throwable $e) {
                // Marks the job as terminally failed and no workers will restart it.
                $this->queue->bury($job);
            }
        }

    }

    /**
     * Gets request body
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
     * Sends response to queue
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

    /**
     * @return int
     */
    public function reconnectsCount(): int
    {
        return $this->reconnectsCount;
    }
}
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di\Injectable;
use Pheanstalk\Contract\PheanstalkInterface;
use Pheanstalk\Job;
use Pheanstalk\Pheanstalk;
use Throwable;

/**
 * Class BeanstalkClient
 *
 * Represents a client for interacting with Beanstalkd server.
 *
 * @package MikoPBX\Core\System
 */
class BeanstalkClient extends Injectable
{
    public const INBOX_PREFIX = 'INBOX_';

    public const QUEUE_ERROR = 'queue_error';

    public const RESPONSE_IN_FILE = 'response-in-file';

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
     * @param string $tube The name of the tube.
     * @param string $port The port number for the Beanstalkd server.
     */
    public function __construct(string $tube = 'default', string $port = '')
    {
        $this->tube = str_replace("\\", '-', $tube);
        $this->port = $port;
        $this->reconnect();
    }

    /**
     * Recreates connection to the Beanstalkd server.
     */
    public function reconnect(): void
    {
        $config = $this->di->getShared(ConfigProvider::SERVICE_NAME)->beanstalk;
        $tmpPort   = $config->port;
        if ( ! empty($this->port) && is_numeric($this->port)) {
            $tmpPort = $this->port;
        }
        $this->queue = Pheanstalk::create($config->host, $tmpPort);
        try {
            $this->queue->useTube($this->tube);
        }catch (Throwable $e){
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->connected = false;
            return;
        }
        foreach ($this->subscriptions as $tube => $callback) {
            $this->subscribe($tube, $callback);
        }
        $this->connected = true;
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
     * @deprecated Use sendRequest instead with array result: list($result, $message) = $client->sendRequest(...)
     *
     * @param      $job_data
     * @param int  $timeout
     * @param int  $priority
     *
     * @return bool|string
     */
    public function request($job_data, int $timeout = 10, int $priority = PheanstalkInterface::DEFAULT_PRIORITY) {
        $this->message = false;
        $inbox_tube    = uniqid(self::INBOX_PREFIX, true);
        $this->queue->watch($inbox_tube);

        // Send message to backend worker
        $requestMessage = [
            $job_data,
            'inbox_tube' => $inbox_tube,
        ];
        $this->publish($requestMessage, null, $priority, 0, $timeout);

        // We wait until a worker process request.
        try {
            $job = $this->queue->reserveWithTimeout($timeout);
            if ($job !== null) {
                $this->message = $job->getData();
                $this->queue->delete($job);
            }
        } catch (Throwable $exception) {
            SystemMessages::sysLogMsg(__METHOD__, $exception->getMessage(), LOG_ERR);
            if(isset($job)){
                $this->buryJob($job);
            }
        }
        $this->queue->ignore($inbox_tube);

        return $this->message;
    }


    /**
     * Sends request and wait for answer from processor
     *
     * @param      $job_data
     * @param int  $timeout
     * @param int  $priority
     *
     * @return array
     */
    public function sendRequest($job_data, int $timeout = 10, int $priority = PheanstalkInterface::DEFAULT_PRIORITY):array
    {
        $result = true;
        $inbox_tube    = uniqid(self::INBOX_PREFIX, true);
        $this->queue->watch($inbox_tube);

        // Send message to backend worker
        $requestMessage = [
            $job_data,
            'inbox_tube' => $inbox_tube,
        ];
        $this->publish($requestMessage, null, $priority, 0, $timeout);

        // We wait until a worker process request.
        try {
            $job = $this->queue->reserveWithTimeout($timeout);
            if ($job !== null) {
                $this->message = $job->getData();
                $this->queue->delete($job);
            } else {
                $this->message = '{"'.self::QUEUE_ERROR.'":"Worker did not answer within timeout '.$timeout.' sec"}';
                $result = false;
            }
        } catch (Throwable $e) {
            if(isset($job)){
                $this->buryJob($job);
            }
            $prettyMessage = CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->message = '{"'.self::QUEUE_ERROR.'":"Exception on '.__METHOD__.' with message: '.$prettyMessage.'"}';
            $result = false;
        }
        $this->queue->ignore($inbox_tube);

        return [$result, $this->message];
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
        $tubes          = $this->queue->listTubes();
        $deletedJobInfo = [];
        foreach ($tubes as $tube) {
            try {
                $this->queue->useTube($tube);
                $queueStats = $this->queue->stats()->getArrayCopy();

                // Delete buried jobs
                $countBuried = $queueStats['current-jobs-buried'];
                while ($job = $this->queue->peekBuried()) {
                    $countBuried--;
                    if ($countBuried < 0) {
                        break;
                    }
                    $id = $job->getId();
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Deleted buried job with ID {$id} from {$tube} with message {$job->getData()}",
                        LOG_DEBUG
                    );
                    $this->queue->delete($job);
                    $deletedJobInfo[] = "{$id} from {$tube}";
                }

                // Delete outdated jobs
                $countReady = $queueStats['current-jobs-ready'];
                while ($job = $this->queue->peekReady()) {
                    $countReady--;
                    if ($countReady < 0) {
                        break;
                    }
                    $id                    = $job->getId();
                    $jobStats              = $this->queue->statsJob($job)->getArrayCopy();
                    $age                   = (int)$jobStats['age'];
                    $expectedTimeToExecute = (int)$jobStats['ttr'] * 2;
                    if ($age > $expectedTimeToExecute) {
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "Deleted outdated job with ID {$id} from {$tube} with message {$job->getData()}",
                            LOG_DEBUG
                        );
                        $this->queue->delete($job);
                        $deletedJobInfo[] = "{$id} from {$tube}";
                    }
                }
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
            }
        }
        if (count($deletedJobInfo) > 0) {
            SystemMessages::sysLogMsg(__METHOD__, "Delete outdated jobs" . implode(PHP_EOL, $deletedJobInfo), LOG_WARNING);
        }
    }


    /**
     * Wait for and process a job from the queue.
     *
     * @param float $timeout The timeout period in seconds.
     *
     * @return void
     */
    public function wait(float $timeout = 5): void
    {
        $this->message = null;

        // Record the start time
        $start         = microtime(true);

        // Try to reserve a job with a timeout
        try {
            $job = $this->queue->reserveWithTimeout((int)$timeout);
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        // If no job was reserved
        if ( ! isset($job)) {
            $workTime = (microtime(true) - $start);
            if ($workTime < $timeout) {
                usleep(100000);
                // If the work time $workTime is less than the timeout value $timeout
                // and no job is received $job === null
                // something is wrong, probably lost connection with the queue server
                $this->reconnect();
            }

            // Call the timeout handler if one is set
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

        // Check the job stats
        $stats           = $this->queue->statsJob($job);
        if (intval($stats['reserves'])>3){
            // Probably an exception did happen during the previous job execution, force to delete it.
            $errorMessage = 'This job has attempted to execute more than 3 times without success.'.PHP_EOL;
            $errorMessage .= 'Job stats: '.json_encode($stats).PHP_EOL;
            $errorMessage .= 'Message: '.json_encode($this->message);
            SystemMessages::sysLogMsg(__METHOD__,$errorMessage,LOG_ALERT);
            $this->buryJob($job);
        }

        // Find the subscribed function for the tube
        $requestFormTube = $stats['tube'];
        $func            = $this->subscriptions[$requestFormTube] ?? null;
        if ($func === null) {
            // No action found, bury the job
            $this->buryJob($job);
        } else {
            try {
                // Execute the subscribed function
                if (is_array($func)) {
                    call_user_func($func, $this);
                } elseif (is_callable($func) === true) {
                    $func($this);
                }
                // Removes the job from the queue when it has been successfully completed
                $this->queue->delete($job);
            } catch (Throwable $e) {
                // Marks the job as terminally failed and no workers will restart it.
                $this->buryJob($job);
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
            }
        }
    }

    /**
     * Buries a job in the Beanstalkd server.
     *
     * @param mixed $job The job to be buried.
     */
    private function buryJob($job):void
    {
        if(!isset($job)){
            return;
        }
        try {
            $this->queue->bury($job);
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Returns the body of the message.
     *
     * @return string The body of the message.
     */
    public function getBody(): string
    {
        if (is_array($this->message)
            && isset($this->message['inbox_tube'])
            && count($this->message) === 2) {
            // If it's a request that requires a response, the data was passed as the first element of the array.
            $message_data = $this->message[0];
        } else {
            $message_data = $this->message;
        }

        return $message_data;
    }

    /**
     * Sends a reply message.
     *
     * @param mixed $response The response message.
     * @return void
     */
    public function reply($response): void
    {
        if (isset($this->message['inbox_tube'])) {
            $this->queue->useTube($this->message['inbox_tube']);
            try {
                $this->queue->put($response);
            } catch (\Throwable $exception) {
                CriticalErrorsHandler::handleExceptionWithSyslog($exception);
            }
            $this->queue->useTube($this->tube);
        }
    }

    /**
     * Sets the error handler for the Beanstalk client.
     *
     * @param mixed $handler The error handler.
     * @return void
     */
    public function setErrorHandler($handler): void
    {
        $this->error_handler = $handler;
    }

    /**
     * Sets the timeout handler for the Beanstalk client.
     *
     * @param mixed $handler The timeout handler.
     * @return void
     */
    public function setTimeoutHandler($handler): void
    {
        $this->timeout_handler = $handler;
    }

    /**
     * Returns the number of times the Beanstalk client has reconnected.
     *
     * @return int The number of reconnects.
     */
    public function reconnectsCount(): int
    {
        return $this->reconnectsCount;
    }

    /**
     * Retrieves messages from a tube.
     *
     * @param string $tube The name of the tube. If empty, uses the default tube.
     * @return array An array of messages retrieved from the tube.
     */
    public function getMessagesFromTube(string $tube = ''): array
    {
        if ($tube !== '') {
            $this->queue->useTube($tube);
        }
        $arrayOfMessages = [];
        while ($job = $this->queue->peekReady()) {
            if (json_decode($job->getData(), true) !== null) {
                $mData = $job->getData();
            } else {
                $mData = unserialize($job->getData(), [false]);
            }
            $arrayOfMessages[] = $mData;
            $this->queue->delete($job);
        }

        return $arrayOfMessages;
    }
}
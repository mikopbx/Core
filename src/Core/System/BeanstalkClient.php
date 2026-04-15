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
use Pheanstalk\Contract\JobIdInterface;
use Pheanstalk\Contract\PheanstalkPublisherInterface;
use Pheanstalk\Exception\JobNotFoundException;
use Pheanstalk\Pheanstalk;
use Pheanstalk\Values\Job;
use Pheanstalk\Values\Timeout;
use Pheanstalk\Values\TubeName;
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
    public const string INBOX_PREFIX = 'INBOX_';

    public const string QUEUE_ERROR = 'queue_error';

    public const string RESPONSE_IN_FILE = 'response-in-file';

    /**
     * Connect timeout passed to Pheanstalk::create(). Kept short so that a
     * dead beanstalkd never hangs a worker on TCP handshake (issue #1010).
     */
    private const int CONNECT_TIMEOUT_SECONDS = 2;

    /**
     * Receive timeout passed to Pheanstalk::create(). Propagated through
     * Pheanstalk 8.x's Timeout objects to SO_RCVTIMEO on the underlying
     * socket — this is the key fix for the "Maximum execution time of 30
     * seconds exceeded" fatal in SocketSocket.php documented by Sentry
     * cluster #27085. See Pheanstalk 4.x SocketSocket.php which set the
     * receive timeout for connect() but then *restored the default* after
     * connecting, leaving read() unbounded. 8.x keeps the receive timeout
     * throughout the socket's lifetime.
     */
    private const int RECEIVE_TIMEOUT_SECONDS = 10;

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
        $tmpPort = (int)$config->port;
        if (!empty($this->port) && is_numeric($this->port)) {
            $tmpPort = (int)$this->port;
        }
        // Pheanstalk 8.x wires the receive timeout through Timeout value
        // objects into SO_RCVTIMEO on the socket (issue #1010 root-cause
        // fix). The connect timeout is short so a dead beanstalkd surfaces
        // a ConnectionException fast instead of hanging the worker.
        $this->queue = Pheanstalk::create(
            $config->host,
            $tmpPort,
            new Timeout(self::CONNECT_TIMEOUT_SECONDS),
            new Timeout(self::RECEIVE_TIMEOUT_SECONDS)
        );
        try {
            $this->queue->useTube(new TubeName($this->tube));
        } catch (Throwable $e) {
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
     * @param array $callback - worker
     */
    public function subscribe(string $tube, array $callback): void
    {
        $tube = str_replace("\\", '-', $tube);
        $this->queue->watch(new TubeName($tube));
        $this->queue->ignore(TubeName::default());
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
    public function request($job_data, int $timeout = 10, int $priority = PheanstalkPublisherInterface::DEFAULT_PRIORITY): bool|string
    {
        $this->message = false;
        $inbox_tube    = uniqid(self::INBOX_PREFIX, true);
        $inboxTubeName = new TubeName($inbox_tube);
        $this->queue->watch($inboxTubeName);

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
        } catch (JobNotFoundException $e) {
            // Expected race: worker TTR expired or the job was already removed.
            // Do not spam Sentry with this (issue #1010 related cluster #27284).
            SystemMessages::sysLogMsg(__METHOD__, 'job gone during delete: ' . $e->getMessage(), LOG_DEBUG);
        } catch (Throwable $exception) {
            SystemMessages::sysLogMsg(__METHOD__, $exception->getMessage(), LOG_ERR);
            if (isset($job)) {
                $this->buryJob($job);
            }
        }
        $this->queue->ignore($inboxTubeName);

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
    public function sendRequest($job_data, int $timeout = 10, int $priority = PheanstalkPublisherInterface::DEFAULT_PRIORITY):array
    {
        $result = true;
        $inbox_tube    = uniqid(self::INBOX_PREFIX, true);
        $inboxTubeName = new TubeName($inbox_tube);
        $this->queue->watch($inboxTubeName);

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
        } catch (JobNotFoundException $e) {
            // Expected race: job already gone. Surface as a queue error but
            // do not report to Sentry (issue #1010 related cluster #27284).
            SystemMessages::sysLogMsg(__METHOD__, 'job gone during delete: ' . $e->getMessage(), LOG_DEBUG);
            $this->message = '{"'.self::QUEUE_ERROR.'":"Job already gone before response"}';
            $result = false;
        } catch (Throwable $e) {
            if (isset($job)) {
                $this->buryJob($job);
            }
            $prettyMessage = CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->message = '{"'.self::QUEUE_ERROR.'":"Exception on '.__METHOD__.' with message: '.$prettyMessage.'"}';
            $result = false;
        }
        $this->queue->ignore($inboxTubeName);

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
     * @return JobIdInterface The job id handle returned by beanstalkd.
     *                         Pheanstalk 8.x returns a lightweight JobId from
     *                         put() rather than the full Job value object.
     */
    public function publish(
        mixed $job_data,
        ?string $tube = null,
        int $priority = PheanstalkPublisherInterface::DEFAULT_PRIORITY,
        int $delay = PheanstalkPublisherInterface::DEFAULT_DELAY,
        int $ttr = PheanstalkPublisherInterface::DEFAULT_TTR
    ): JobIdInterface {
        $tube = str_replace("\\", '-', $tube ?? '');

        // Change tube
        if ($tube !== '' && $this->tube !== $tube) {
            $this->queue->useTube(new TubeName($tube));
        }
        $job_data = serialize($job_data);
        // Send JOB to queue
        $result = $this->queue->put($job_data, $priority, $delay, $ttr);

        // Return original tube
        $this->queue->useTube(new TubeName($this->tube));

        return $result;
    }

    /**
     * Drops orphaned tasks
     */
    public function cleanTubes(): void
    {
        $tubes          = $this->queue->listTubes();
        $deletedJobInfo = [];
        // Pheanstalk 8.x returns a TubeList (IteratorAggregate<TubeName>), so
        // $tube below is already a TubeName value object, not a string.
        foreach ($tubes as $tube) {
            try {
                $this->queue->useTube($tube);
                // 8.x fix: use statsTube() for per-tube counters instead of
                // stats() which returns global ServerStats. The 4.x code
                // confusingly accessed `current-jobs-buried` on global stats
                // but it was never scoped to the tube under the use-loop.
                $tubeStats = $this->queue->statsTube($tube);

                // Delete buried jobs
                $countBuried = $tubeStats->currentJobsBuried;
                while ($job = $this->queue->peekBuried()) {
                    $countBuried--;
                    if ($countBuried < 0) {
                        break;
                    }
                    $id = $job->getId();
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Deleted buried job with ID $id from {$tube->value} with message {$job->getData()}",
                        LOG_DEBUG
                    );
                    try {
                        $this->queue->delete($job);
                        $deletedJobInfo[] = "$id from {$tube->value}";
                    } catch (JobNotFoundException $e) {
                        // Race: job gone between peek and delete — expected
                        // when another worker or GC grabbed it. Do not report
                        // to Sentry (issue #1010 / #27116 noise source).
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "buried job $id vanished before delete: " . $e->getMessage(),
                            LOG_DEBUG
                        );
                    }
                }

                // Delete outdated jobs
                $countReady = $tubeStats->currentJobsReady;
                while ($job = $this->queue->peekReady()) {
                    $countReady--;
                    if ($countReady < 0) {
                        break;
                    }
                    $id = $job->getId();
                    try {
                        $jobStats = $this->queue->statsJob($job);
                    } catch (JobNotFoundException $e) {
                        // Race: job gone between peek and statsJob.
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "ready job $id vanished before statsJob: " . $e->getMessage(),
                            LOG_DEBUG
                        );
                        continue;
                    }
                    $age                   = $jobStats->age;
                    $expectedTimeToExecute = $jobStats->timeToRelease * 2;
                    if ($age > $expectedTimeToExecute) {
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "Deleted outdated job with ID $id from {$tube->value} with message {$job->getData()}",
                            LOG_DEBUG
                        );
                        try {
                            $this->queue->delete($job);
                            $deletedJobInfo[] = "$id from {$tube->value}";
                        } catch (JobNotFoundException $e) {
                            SystemMessages::sysLogMsg(
                                __METHOD__,
                                "outdated job $id vanished before delete: " . $e->getMessage(),
                                LOG_DEBUG
                            );
                        }
                    }
                }
            } catch (JobNotFoundException $e) {
                // Expected race on peek/stats/delete — swallow without Sentry.
                SystemMessages::sysLogMsg(__METHOD__, 'job gone during cleanup: ' . $e->getMessage(), LOG_DEBUG);
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
            $mData = unserialize($job->getData(), ['allowed_classes' => false]);
        }
        $this->message = $mData;

        // Check the job stats. Pheanstalk 8.x returns a JobStats value
        // object with typed properties (->reserves, ->tube as TubeName, ...)
        // instead of the 4.x ArrayResponse with string indices.
        try {
            $stats = $this->queue->statsJob($job);
        } catch (JobNotFoundException $e) {
            // Job vanished between reserve and statsJob — race, nothing to
            // do here. Do not report to Sentry (issue #1010).
            SystemMessages::sysLogMsg(
                __METHOD__,
                "job {$job->getId()} vanished before statsJob: " . $e->getMessage(),
                LOG_DEBUG
            );
            return;
        }
        if ($stats->reserves > 3) {
            // Probably an exception did happen during the previous job execution, force to delete it.
            $errorMessage  = 'This job has attempted to execute more than 3 times without success.' . PHP_EOL;
            $errorMessage .= '  Job reserves: ' . $stats->reserves . PHP_EOL;
            $errorMessage .= '  Job tube: ' . $stats->tube->value . PHP_EOL;
            $errorMessage .= '  Message: ' . json_encode($this->message);
            SystemMessages::sysLogMsg(__METHOD__, $errorMessage, LOG_ALERT);
            $this->buryJob($job);
        }

        // Find the subscribed function for the tube
        $requestFormTube = $stats->tube->value;
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
            } catch (JobNotFoundException $e) {
                // Worker ran past the job's TTR so beanstalkd moved it back
                // to ready before we got here. Nothing to do, and nothing
                // worth reporting to Sentry (issue #1010 / #27284).
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "job {$job->getId()} vanished before delete: " . $e->getMessage(),
                    LOG_DEBUG
                );
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
     * @param ?JobIdInterface $job The job to be buried.
     */
    private function buryJob(?JobIdInterface $job):void
    {
        if (!isset($job)) {
            return;
        }
        try {
            $this->queue->bury($job);
        } catch (JobNotFoundException $e) {
            // Job already removed (TTR race) — nothing to bury, skip Sentry.
            // Issue #1010 / #27283 noise source.
            SystemMessages::sysLogMsg(
                __METHOD__,
                "job {$job->getId()} gone before bury: " . $e->getMessage(),
                LOG_DEBUG
            );
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
     * @param string $response The response message.
     * @return void
     */
    public function reply(string $response): void
    {
        if (isset($this->message['inbox_tube'])) {
            $this->queue->useTube(new TubeName($this->message['inbox_tube']));
            try {
                $this->queue->put($response);
            } catch (\Throwable $exception) {
                CriticalErrorsHandler::handleExceptionWithSyslog($exception);
            }
            $this->queue->useTube(new TubeName($this->tube));
        }
    }

    /**
     * Sets the error handler for the Beanstalk client.
     *
     * @param mixed $handler The error handler.
     * @return void
     */
    public function setErrorHandler(mixed $handler): void
    {
        $this->error_handler = $handler;
    }

    /**
     * Sets the timeout handler for the Beanstalk client.
     *
     * @param mixed $handler The timeout handler.
     * @return void
     */
    public function setTimeoutHandler(mixed $handler): void
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
            $this->queue->useTube(new TubeName($tube));
        }
        $arrayOfMessages = [];
        while ($job = $this->queue->peekReady()) {
            if (json_decode($job->getData(), true) !== null) {
                $mData = $job->getData();
            } else {
                $mData = unserialize($job->getData(), ['allowed_classes' => false]);
            }
            $arrayOfMessages[] = $mData;
            try {
                $this->queue->delete($job);
            } catch (JobNotFoundException $e) {
                // Race: job disappeared between peek and delete.
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "job {$job->getId()} vanished before delete: " . $e->getMessage(),
                    LOG_DEBUG
                );
            }
        }

        return $arrayOfMessages;
    }

    /**
     * Release the underlying socket. Thin wrapper around Pheanstalk 8.x's
     * disconnect() so workers can explicitly free resources on shutdown
     * instead of relying on garbage collection. Mirrors the WorkerBase
     * closeRedis() pattern from issue #1022.
     */
    public function close(): void
    {
        try {
            $this->queue->disconnect();
        } catch (Throwable) {
            // Ignore — shutdown path, best-effort release.
        }
        $this->connected = false;
    }
}
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Notifications, Util};
use Throwable;

/**
 * WorkerNotifyError is a worker class responsible for sending notifications.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerNotifyError extends WorkerBase
{
    private array $queue = [];
    private int $starting_point = 0;
    private int $interval = 28800;

    /**
     * Starts the worker and subscribes to notification channels.
     *
     * @param array $params The command-line arguments.
     * @return void
     */
    public function start($params): void
    {
        $client = new BeanstalkClient('WorkerNotifyError_license');
        if ($client->isConnected() === false) {
            Util::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }
        $client->subscribe('WorkerNotifyError_license', [$this, 'onLicenseError']);
        $client->subscribe('WorkerNotifyError_storage', [$this, 'onStorageError']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * Callback function for ping events. Checks if notification needs to be sent.
     *
     * @param BeanstalkClient $message The message received from Beanstalkd.
     * @return void
     */
    public function pingCallBack($message): void
    {
        parent::pingCallBack($message);
        if (count($this->queue) > 0 && (time() - $this->starting_point) > $this->interval) {
            $this->sendNotify();
            $this->starting_point = time();
            $this->queue = [];
        }
    }

    /**
     * Sends notification
     *
     * @return void
     */
    private function sendNotify()
    {
        $config = new MikoPBXConfig();
        $to = $config->getGeneralSettings('SystemNotificationsEmail');
        if (empty($to)) {
            return;
        }
        $test_email = '';
        foreach ($this->queue as $text_error => $section) {
            if (empty($text_error)) {
                continue;
            }
            if (Util::isJson($text_error)) {
                $data = json_decode($text_error, true);
                $test_email .= "<hr>";
                $test_email .= "{$section}";
                $test_email .= "<hr>";
                foreach ($data as $key => $value) {
                    $test_email .= "{$key}: {$value}<br>";
                }
                $test_email .= "<hr>";
            } else {
                $test_email .= "$text_error <br>";
            }
        }

        $notifier = new Notifications();
        $notifier->sendMail($to, 'MikoPBX Errors', $test_email);
    }

    /**
     * Handles the license error event.
     *
     * @param BeanstalkClient $message The message received from Beanstalkd.
     * @return void
     */
    public function onLicenseError(BeanstalkClient $message)
    {
        $body = $message->getBody();
        if (empty($body)) {
            return;
        }
        // Add unique data to the queue
        $this->queue[$body] = 'License error:';
    }

    /**
     * Handles the storage error event.
     *
     * @param BeanstalkClient $message The message received from Beanstalkd.
     * @return void
     */
    public function onStorageError(BeanstalkClient $message)
    {
        $body = $message->getBody();
        if (empty($body)) {
            return;
        }
        $mail_body = trim($body);

        // Add unique data to the queue
        $this->queue[$mail_body] = 'Storage error:';
    }

}


// Start worker process
WorkerNotifyError::startWorker($argv ?? []);
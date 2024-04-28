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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Notifications, SystemMessages, Util};
use MikoPBX\Common\Models\PbxSettingsConstants;

/**
 * WorkerNotifyByEmail is a worker class responsible for sending notifications.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerNotifyByEmail extends WorkerBase
{
    /**
     * Entry point for the worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $client = new BeanstalkClient(__CLASS__);
        if ($client->isConnected() === false) {
            SystemMessages::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }
        $client->subscribe(__CLASS__, [$this, 'workerNotifyByEmail']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * The main worker method for sending email notifications.
     *
     * @param mixed $message The message received from Beanstalkd.
     * @return void
     */
    public function workerNotifyByEmail($message): void
    {
        $notifier = new Notifications();
        $config = new MikoPBXConfig();
        $settings = $config->getGeneralSettings();

        /** @var BeanstalkClient $message */
        $data = json_decode($message->getBody(), true);

        $template_body = $settings[PbxSettingsConstants::MAIL_TPL_MISSED_CALL_BODY];
        $template_subject = $settings[ PbxSettingsConstants::MAIL_TPL_MISSED_CALL_SUBJECT];

        // Set default subject if not provided
        if (empty($template_subject)) {
            $template_subject = Util::translate("You have missing call") . ' <-- NOTIFICATION_CALLERID';
        }
        $template_Footer = $settings[PbxSettingsConstants::MAIL_TPL_MISSED_CALL_FOOTER];
        $emails = [];

        $tmpArray = [];
        foreach ($data as $call) {
            $keyHash = $call['email'] . $call['start'] . $call['from_number'] . $call['to_number'];

            // Skip duplicate emails
            if (in_array($keyHash, $tmpArray, true)) {
                continue;
            }
            $tmpArray[] = $keyHash;
            if (!isset($emails[$call['email']])) {
                $emails[$call['email']] = [
                    'subject' => $this->replaceParams($template_subject, $call),
                    'body' => '',
                    'footer' => $this->replaceParams($template_Footer, $call),
                ];
            }
            if (!empty($template_body)) {
                $email = $this->replaceParams($template_body, $call);
                $emails[$call['email']]['body'] .= "$email <br><hr><br>";
            }
        }

        foreach ($emails as $to => $email) {
            $subject = $email['subject'];
            $body = "{$email['body']}<br>{$email['footer']}";
            $notifier->sendMail($to, $subject, $body);
        }
        sleep(1);
    }

    /**
     * Replaces the placeholders in the source string with the provided parameters.
     *
     * @param string $src The source string.
     * @param array $params The parameters to replace.
     * @return string The modified string.
     */
    private function replaceParams(string $src, array $params): string
    {
        return str_replace(
            [
                "\n",
                "NOTIFICATION_MISSEDCAUSE",
                "NOTIFICATION_CALLERID",
                "NOTIFICATION_TO",
                "NOTIFICATION_DURATION",
                "NOTIFICATION_DATE"
            ],
            [
                "<br>",
                'NOANSWER',
                $params['from_number'],
                $params['to_number'],
                $params['duration'],
                explode('.', $params['start'])[0]
            ],
            $src);
    }
}

// Start worker process
WorkerNotifyByEmail::startWorker($argv ?? []);
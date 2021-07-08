<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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


class WorkerNotifyByEmail extends WorkerBase
{
    /**
     * Entry point
     *
     * @param $argv
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient(__CLASS__);
        $client->subscribe(__CLASS__, [$this, 'workerNotifyByEmail']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * Main worker
     * @param $message
     */
    public function workerNotifyByEmail($message): void
    {
        $config   = new MikoPBXConfig();
        $settings = $config->getGeneralSettings();

        /** @var BeanstalkClient $message */
        $data = json_decode($message->getBody(), true);

        $template_body   = $settings['MailTplMissedCallBody'];
        $template_Footer = $settings['MailTplMissedCallFooter'];
        $emails          = [];

        $tmpArray = [];
        foreach ($data as $call) {
            $keyHash = $call['email'].$call['start'].$call['from_number'].$call['to_number'];
            if(in_array($keyHash, $tmpArray, true)){
                continue;
            }
            $tmpArray[] = $keyHash;
            /**
             * 'language'
             * 'is_internal'
             */
            if ( ! isset($emails[$call['email']])) {
                $emails[$call['email']] = '';
            }

            if (empty($template_body)) {
                $email = Util::translate('You have missing call');
            } else {
                $email = str_replace(
                    array(
                        "\n",
                        "NOTIFICATION_MISSEDCAUSE",
                        "NOTIFICATION_CALLERID",
                        "NOTIFICATION_TO",
                        "NOTIFICATION_DURATION",
                        "NOTIFICATION_DATE"
                    ),
                    array("<br>",
                        'NOANSWER',
                        $call['from_number'],
                        $call['to_number'],
                        $call['duration'],
                        $call['start']
                    ),
                    $template_body
                );
            }
            $emails[$call['email']] .= "$email <br> <hr> <br>";
        }

        if (isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress']) != '') {
            $from_address = $settings['MailSMTPSenderAddress'];
        } else {
            $from_address = $settings['MailSMTPUsername'];
        }

        foreach ($emails as $to => $text) {
            $subject = str_replace('MailSMTPSenderAddress', $from_address, $settings['MailTplMissedCallSubject']);
            if (empty($subject)) {
                $subject = Util::translate("You have missing call");
            }

            $body = "{$text}<br>{$template_Footer}";
            $notifier = new Notifications();
            $notifier->sendMail($to, $subject, $body);
        }
        sleep(1);
    }
}

// Start worker process
WorkerNotifyByEmail::startWorker($argv??null);
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';
use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Notifications, Util};
use Throwable;


class WorkerNotifyByEmail extends WorkerBase
{
    protected int $maxProc=1;
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

        while (true) {
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
            Notifications::sendMail($to, "$subject", $body);
        }
        sleep(1);
    }
}

// Start worker process
$workerClassname = WorkerNotifyByEmail::class;
$action = $argv[1]??'';
if ($action === 'start') {
    cli_set_process_title($workerClassname);
    while (true) {
        try {
            $worker = new $workerClassname();
            $worker->start($argv);
        } catch (Throwable $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}

<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Notifications, Util};
use Exception;

require_once 'globals.php';


class WorkerNotifyByEmail extends WorkerBase
{
    /**
     * Entry point
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient(__CLASS__);
        $client->subscribe(__CLASS__, [$this, 'workerNotifyByEmail']);
        $client->subscribe('ping_' . self::class, [$this, 'pingCallBack']);

        while (true) {
            $client->wait();
        }
    }

    /**
     * Main worker
     *
     * @param $message
     */
    public function workerNotifyByEmail($message): void
    {
        $config   = new MikoPBXConfig();
        $settings = $config->getGeneralSettings();

        /** @var BeanstalkClient $message */
        $data = json_decode($message->getBody(), true);
        if (isset($data['NOANSWER'])) {
            // Вызов клиента отвечен одним из сотрудников. Но не все участники подняли трубку.
            return;
        }
        $template_body   = $settings['MailTplMissedCallBody'];
        $template_Footer = $settings['MailTplMissedCallFooter'];
        $emails          = [];
        foreach ($data as $call) {
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
                $email = str_replace("\n", "<br>", $template_body);
                $email = str_replace("NOTIFICATION_MISSEDCAUSE", 'NOANSWER', $email);
                $email = str_replace("NOTIFICATION_CALLERID", $call['from_number'], $email);
                $email = str_replace("NOTIFICATION_TO", $call['to_number'], $email);
                $email = str_replace("NOTIFICATION_DURATION", $call['duration'], $email);
                $email = str_replace("NOTIFICATION_DATE", $call['start'], $email);
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
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    while (true) {
        try {
            $worker = new $workerClassname();
            $worker->start($argv);
        } catch (Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}

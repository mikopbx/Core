<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use PHPMailer;

/**
 * Уведомления.
 */
class Notifications
{

    /**
     * Отправка сообщения с использованием PHPMailer
     *
     * @param      $to
     * @param      $subject
     * @param      $message
     * @param bool $filename
     *
     * @return bool|string
     */
    public static function sendMail($to, $subject, $message, $filename = false)
    {
        $mikoPBXConfig        = new MikoPBXConfig();
        $settings             = $mikoPBXConfig->getGeneralSettings();
        $enable_notifications = $settings['MailEnableNotifications'];

        if ("$enable_notifications" != "1") {
            return 'Notifications disabled...';
        }

        if (isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress']) != '') {
            $from_address = $settings['MailSMTPSenderAddress'];
        } else {
            $from_address = $settings['MailSMTPUsername'];
        }
        // Loaded over Composer
        // require_once '/etc/inc/PHPMailer/Exception.php';
        // require_once '/etc/inc/PHPMailer/PHPMailer.php';
        // require_once '/etc/inc/PHPMailer/SMTP.php';
        $messages = [];
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer();
            $mail->isSMTP();
            $mail->SMTPDebug = 0;

            $mail->Host = $settings['MailSMTPHost'];
            if ($settings["MailSMTPUseTLS"] == "1") {
                $mail->SMTPSecure = 'tls';
            } else {
                $mail->SMTPSecure = '';
            }

            if (empty($settings['MailSMTPUsername']) && empty($settings['MailSMTPPassword'])) {
                $mail->SMTPAuth = false;
            } else {
                $mail->SMTPAuth = true;
                $mail->Username = $settings['MailSMTPUsername'];
                $mail->Password = $settings['MailSMTPPassword'];
                if ($settings["MailSMTPCertCheck"] != '1') {
                    $mail->SMTPOptions = [
                        'ssl' => [
                            'verify_peer'       => false,
                            'verify_peer_name'  => false,
                            'allow_self_signed' => true,
                        ],
                    ];
                }
            }

            if (empty($settings['MailSMTPFromUsername'])) {
                $from_name = 'MikoPBX Notification';
            } else {
                $from_name = $settings['MailSMTPFromUsername'];
            }

            $mail->Port    = (integer)$settings['MailSMTPPort'];
            $mail->CharSet = 'UTF-8';

            $mail->setFrom($from_address, $from_name);
            $mail->addAddress($to);
            if (file_exists($filename)) {
                $mail->addAttachment($filename);
            }
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $message;

            if ( ! $mail->send()) {
                $messages[] = $mail->ErrorInfo;
            }
        } catch (\Exception $e) {
            $messages[] = $e->getMessage();
        }

        if (count($messages)>0) {
            Util::sysLogMsg('PHPMailer', implode(' ', $messages), LOG_ERR);
            return implode(' ', $messages);
        } else {
            return true;
        }
    }

    /**
     * Настройка msmtp.
     *
     */
    public function configure(): void
    {

        $mikoPBXConfig = new MikoPBXConfig();
        $settings      = $mikoPBXConfig->getGeneralSettings();

        $conf = "defaults\n" .
            "auth       on\n" .
            // "logfile    /var/log/msmtp.log\n".
            "timeout    10\n" .
            "syslog     LOG_LOCAL0\n\n";

        if (isset($settings["MailSMTPUseTLS"]) && $settings["MailSMTPUseTLS"] == "1") {
            $conf .= "tls on\n";
            $conf .= "tls_starttls on\n";
            if (isset($settings["MailSMTPCertCheck"]) && $settings["MailSMTPCertCheck"] == '1') {
                $conf .= "tls_certcheck on\n";
                $conf .= "tls_trust_file /etc/ssl/certs/ca-certificates.crt\n";
            } else {
                $conf .= "tls_certcheck off\n";
            }
            $conf .= "\n";
        }
        if (isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress']) != '') {
            $from = $settings['MailSMTPSenderAddress'];
        } else {
            $from = $settings['MailSMTPUsername'];
        }

        $conf .= "account     general\n";
        $conf .= "host        {$settings['MailSMTPHost']}\n";
        $conf .= "port        {$settings['MailSMTPPort']}\n";
        $conf .= "from        {$from}\n";
        if (empty($settings['MailSMTPUsername']) && empty($settings['MailSMTPPassword'])) {
            $conf .= "auth        off\n";
        } else {
            $conf .= "user        {$settings['MailSMTPUsername']}\n";
            $conf .= "password    {$settings['MailSMTPPassword']}\n\n";
        }

        $conf .= "account default : general\n";

        /**
         * defaults
         * auth on
         * logfile /var/log/msmtp.log
         * timeout 20
         * syslog  LOG_LOCAL0
         *
         * tls on
         * tls_starttls on
         * tls_trust_file /etc/ssl/certs/ca-certificates.crt
         * #tls_certcheck off
         *
         * account     yandex
         * host        smtp.yandex.ru
         * port        587
         * from        boffart@yandex.ru
         * user        boffart@yandex.ru
         * password    123qwered
         *
         * account        gmail
         * host           smtp.gmail.com
         * port           587
         * from           testmikoacc@gmail.com
         * user           testmikoacc@gmail.com
         * password       tdkfsdkf33424
         *
         * account        mail
         * host           smtp.mail.ru
         * port           587
         * from           alexey_P_05@mail.ru
         * user           alexey_P_05@mail.ru
         * password       123qwered
         *
         * account default : gmail
         */

        Util::fileWriteContent("/etc/msmtp.conf", $conf);
        chmod("/etc/msmtp.conf", 384);
    }

}
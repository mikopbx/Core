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

namespace MikoPBX\Core\System;

use PHPMailer;
use Throwable;

/**
 * Уведомления.
 */
class Notifications
{

    /**
     * Отправка сообщения с использованием PHPMailer
     *
     * @param      $to
     * @param        $subject
     * @param        $message
     * @param string $filename
     *
     * @return bool
     */
    public static function sendMail($to, $subject, $message, string $filename = ''):bool
    {
        $mikoPBXConfig        = new MikoPBXConfig();
        $settings             = $mikoPBXConfig->getGeneralSettings();
        $enable_notifications = $settings['MailEnableNotifications'];

        if ($enable_notifications !== "1") {
            return false;
        }

        if (isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress']) !== '') {
            $from_address = $settings['MailSMTPSenderAddress'];
        } else {
            $from_address = $settings['MailSMTPUsername'];
        }
        $messages = [];
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer();
            $mail->isSMTP();
            $mail->SMTPDebug = 0;

            $mail->Host = $settings['MailSMTPHost'];
            if ($settings["MailSMTPUseTLS"] === "1") {
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
                if ($settings["MailSMTPCertCheck"] !== '1') {
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
        } catch (Throwable $e) {
            $messages[] = $e->getMessage();
        }

        if (count($messages)>0) {
            Util::sysLogMsg('PHPMailer', implode(' ', $messages), LOG_ERR);
            return false;
        }
        return true;
    }

    public static function sendTestMail(): bool{
        $mikoPBXConfig        = new MikoPBXConfig();
        $settings             = $mikoPBXConfig->getGeneralSettings();
        $systemNotificationsEmail = $settings['SystemNotificationsEmail'];
        $result = self::sendMail($systemNotificationsEmail, 'Test mail from MIKO PBX', '<b>Test message</b><hr>');
        return ($result===true);
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
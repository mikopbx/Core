<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use Phalcon\Exception;
use PHPMailer;

/**
 * Уведомления.
 */
class Notifications
{

    /**
     * Отправка почтового сообщения ( используется функция mail() ).
     *
     * @param $to
     * @param $subject
     * @param $message
     * @param $file
     *
     * @return array
     */
    public static function sendMailOld($to, $subject, $message, $file = false)
    {
        $mikoPBXConfig        = new MikoPBXConfig();
        $settings             = $mikoPBXConfig->getGeneralSettings();
        $enable_notifications = $settings['MailEnableNotifications'];
        if ("$enable_notifications" != "1") {
            return ['result' => 'ERROR', 'message' => 'Notifications is not enable...'];
        }
        $result = [];

        $subject = str_replace(':', '&brvbar;', $subject);
        $subject = str_replace("", '', $subject);
        $subject = str_replace("\n", '&#010;', $subject);

        $message = str_replace(':', '&#013;', $message);
        $message = str_replace("", '', $message);
        $message = str_replace("\n", '&brvbar;', $message);

        $EOL       = "\r\n";
        $separator = md5(uniqid(time(), true));

        $bodyMail = "--$separator{$EOL}";
        $bodyMail .= "Content-type: text/html; charset='utf-8'{$EOL}";
        $bodyMail .= "{$message} <hr>\n\n{$EOL}";
        $bodyMail .= "--{$separator}{$EOL}";

        if ($file && is_file($file)) {
            $fileRead      = fopen($file, "r");
            $contentFile   = fread($fileRead, filesize($file));
            $file_name_b64 = base64_encode(basename($file));
            fclose($fileRead);

            $bodyMail .= "Content-Type: application/octet-stream; name==?utf-8?B?{$file_name_b64}?={$EOL}";
            $bodyMail .= "Content-Transfer-Encoding: base64{$EOL}";
            $bodyMail .= "Content-Disposition: attachment; filename==?utf-8?B?{$file_name_b64}?={$EOL}{$EOL}";
            $bodyMail .= chunk_split(base64_encode($contentFile)) . "{$EOL}";
            $bodyMail .= "--" . $separator . "--{$EOL}";
        }

        if (isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress']) != '') {
            $from_address = $settings['MailSMTPSenderAddress'];
        } else {
            $from_address = $settings['MailSMTPUsername'];
        }

        $headers_arr = [
            'From'         => "System Notifications <{$from_address}>",
            'Date'         => "" . date("r"),
            'Content-Type' => "multipart/mixed; boundary=\"$separator\"",
        ];
        $headers     = '';
        foreach ($headers_arr as $key => $value) {
            $headers .= "{$key}: {$value}{$EOL}";
        }
        $mail_sent        = mail($to, $subject, $bodyMail, $headers);
        $result['result'] = ($mail_sent) ? 'Success' : 'ERROR';
        if ( ! $mail_sent) {
            Util::mwExec('logread | grep msmtp | tail -n 1', $arr);
            $result['message'] = implode(' ', $arr);
        }

        return $result;
    }

    /**
     * Отправка сообщения с использованием PHPMailer
     *
     * @param      $to
     * @param      $subject
     * @param      $message
     * @param bool $filename
     *
     * @return array
     */
    public static function sendMail($to, $subject, $message, $filename = false)
    {
        $mikoPBXConfig        = new MikoPBXConfig();
        $settings             = $mikoPBXConfig->getGeneralSettings();
        $enable_notifications = $settings['MailEnableNotifications'];
        $result               = [];

        if ("$enable_notifications" != "1") {
            return ['result' => 'ERROR', 'message' => 'Notifications is not enable...'];
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
                $from_name = 'Askozia Notification';
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
                $result['result']  = 'ERROR';
                $result['message'] = $mail->ErrorInfo;
            } else {
                $result['result'] = 'Success';
            }
        } catch (Exception $e) {
            $result['result']  = 'ERROR';
            $result['message'] = $e->getMessage();
        }

        if ('ERROR' == $result['result']) {
            Util::sysLogMsg('PHPMailer', $result['message'], LOG_ERR);
        }

        return $result;
    }

    /**
     * Настройка msmtp.
     *
     * @return array
     */
    public function configure()
    {
        $result = [
            'result' => 'Success',
        ];

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

        return $result;
    }

}
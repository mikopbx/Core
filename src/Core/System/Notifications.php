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

use PHPMailer\PHPMailer\PHPMailer;
use Throwable;

/**
 * Уведомления.
 */
class Notifications
{
    public const TYPE_PHP_MAILER = 'PHP_MAILER';
    private array $settings;
    private bool  $enableNotifications;
    private string $fromAddres;
    private string $fromName;

    /**
     * Notifications constructor.
     */
    public function __construct()
    {
        $mikoPBXConfig  = new MikoPBXConfig();
        $this->settings = $mikoPBXConfig->getGeneralSettings();
        $this->enableNotifications = $this->settings['MailEnableNotifications'] === '1';

        $mailSMTPSenderAddress = $this->settings['MailSMTPSenderAddress'] ?? '';
        if (!empty($mailSMTPSenderAddress)) {
            $this->fromAddres = $mailSMTPSenderAddress;
        } else {
            $this->fromAddres = $this->settings['MailSMTPUsername'];
        }

        if (empty($this->settings['MailSMTPFromUsername'])) {
            $this->fromName = 'MikoPBX Notification';
        } else {
            $this->fromName = $this->settings['MailSMTPFromUsername'];
        }
    }

    /**
     * Возвращает инициализированный объект PHPMailer.
     * @return PHPMailer
     */
    public function getMailSender():PHPMailer
    {
        $mail = new PHPMailer();
        $mail->isSMTP();
        $mail->SMTPDebug = 0;
        $mail->Timeout   = 5;
        $mail->Host = $this->settings['MailSMTPHost'];
        if ($this->settings["MailSMTPUseTLS"] === "1") {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = '';
        }
        if (empty($this->settings['MailSMTPUsername']) && empty($this->settings['MailSMTPPassword'])) {
            $mail->SMTPAuth = false;
        } else {
            $mail->SMTPAuth = true;
            $mail->Username = $this->settings['MailSMTPUsername'];
            $mail->Password = $this->settings['MailSMTPPassword'];
            if ($this->settings["MailSMTPCertCheck"] !== '1') {
                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer'       => false,
                        'verify_peer_name'  => false,
                        'allow_self_signed' => true,
                    ],
                ];
            }
        }
        $mail->Port    = (integer)$this->settings['MailSMTPPort'];
        $mail->CharSet = 'UTF-8';

        return $mail;
    }

    public static function checkConnection($type):bool
    {
        $timeoutPath = Util::which('timeout');
        $phpPath = Util::which('php');
        $result  = Processes::mwExec("$timeoutPath 5 $phpPath -f /etc/rc/emailTestConnection.php ".$type);
        if($result !== 0 ){
            Util::sysLogMsg('PHPMailer', 'Error connect to SMTP server... ('. $type.')', LOG_ERR);
        }

        return ($result === 0);
    }

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
    public function sendMail($to, $subject, $message, string $filename = ''):bool
    {
        if (! $this->enableNotifications) {
            return false;
        }
        $messages = [];
        try {
            $mail = $this->getMailSender();
            $mail->setFrom($this->fromAddres, $this->fromName);
            $to = explode(',', $to);
            foreach ($to as $email){
                $mail->addAddress($email);
            }
            if (file_exists($filename)) {
                $mail->addAttachment($filename);
            }
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $message;

            if(!self::checkConnection(self::TYPE_PHP_MAILER)){
                return false;
            }
            if ( ! $mail->send()) {
                $messages[] = $mail->ErrorInfo;
            }
        } catch (Throwable $e) {
            $messages[] = $e->getMessage();
        }
        if (!empty($messages)) {
            Util::sysLogMsg('PHPMailer', implode(' ', $messages), LOG_ERR);
        }
        return true;
    }

    /**
     * Отправка тестового сообщения.
     * @return bool
     */
    public function sendTestMail(): bool{
        if(!self::checkConnection(self::TYPE_PHP_MAILER)){
            return false;
        }
        $systemNotificationsEmail = $this->settings['SystemNotificationsEmail'];
        $result = $this->sendMail($systemNotificationsEmail, 'Test mail from MIKO PBX', '<b>Test message</b><hr>');
        return ($result===true);
    }

    public static function testConnectionMSMTP():bool
    {
        $path = Util::which('msmtp');
        $result = Processes::mwExec("$path --file=/etc/msmtp.conf -S --timeout 1", $out);
        return ($result === 0);
    }

    public function testConnectionPHPMailer():bool
    {
        $mail = $this->getMailSender();
        try {
            $result = $mail->smtpConnect();
        }catch (\Exception $e){
            $result = false;
        }
        return $result;
    }
}
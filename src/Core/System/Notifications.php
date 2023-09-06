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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di;
use PHPMailer\PHPMailer\PHPMailer;
use Throwable;

/**
 * Class Notifications
 *
 * @package MikoPBX\Core\System
 */
class Notifications
{
    public const TYPE_PHP_MAILER = 'PHP_MAILER';
    private array $settings;
    private bool $enableNotifications;
    private string $fromAddres;
    private string $fromName;

    /**
     * Notifications constructor.
     */
    public function __construct()
    {
        $mikoPBXConfig = new MikoPBXConfig();
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
     * Tests the connection to the msmtp mail server.
     * @return bool True if the connection is successful, false otherwise.
     */
    public static function testConnectionMSMTP(): bool
    {
        $path = Util::which('msmtp');
        $result = Processes::mwExec("$path --file=/etc/msmtp.conf -S --timeout 1", $out);
        return ($result === 0);
    }

    /**
     * Send an admin notification.
     *
     * @param string $subject The subject of the notification.
     * @param array $messages An array of messages to be included in the notification.
     * @param bool $urgent (optional) Set to true for urgent notifications to bypass caching.
     *
     * @return void
     */
    public static function sendAdminNotification(string $subject, array $messages, bool $urgent=false): void
    {
        // Prevent sending the same message twice.
        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = 'sendAdminNotification:' . md5($subject . implode('', $messages));
        $cacheTime = 3600 * 24; // 1 day

        // Check if the message is not urgent and has been sent recently from cache.
        if (!$urgent &&  $managedCache->has($cacheKey)) {
            return;
        }

        // Check if the notification system is available (e.g., PHP Mailer is configured and working).
        if (!Notifications::checkConnection(Notifications::TYPE_PHP_MAILER)) {
            return;
        }

        // Translate the subject and messages to the desired language.
        $subject = Util::translate($subject, false);
        $text = '';
        foreach ($messages as $message) {
            $text .= '<br>' . Util::translate($message, false);
        }
        $text = $text . '<br><br>' . Network::getInfoMessage();

        // Get the admin email address from PbxSettings.
        $adminMail = PbxSettings::getValueByKey('SystemNotificationsEmail');
        $notify = new Notifications();
        $result = $notify->sendMail($adminMail, $subject, trim($text));

        // If the notification was sent successfully, cache it to prevent duplicates.
        if ($result) {
            $managedCache->set($cacheKey, true, $cacheTime);
        }

    }

    /**
     * Sends a test email.
     * @return bool True if the test email is sent successfully, false otherwise.
     */
    public function sendTestMail(): bool
    {
        if (!self::checkConnection(self::TYPE_PHP_MAILER)) {
            return false;
        }
        $systemNotificationsEmail = $this->settings['SystemNotificationsEmail'];
        $result = $this->sendMail($systemNotificationsEmail, 'Test mail from MIKO PBX', '<b>Test message</b><hr>');
        return ($result === true);
    }

    /**
     * Checks the connection to the specified type of mail server.
     * @param string $type The type of mail server.
     * @return bool True if the connection is successful, false otherwise.
     */
    public static function checkConnection($type): bool
    {
        $timeoutPath = Util::which('timeout');
        $phpPath = Util::which('php');
        $result = Processes::mwExec("$timeoutPath 5 $phpPath -f /etc/rc/emailTestConnection.php " . $type);
        if ($result !== 0) {
            Util::sysLogMsg('PHPMailer', 'Error connect to SMTP server... (' . $type . ')', LOG_ERR);
        }

        return ($result === 0);
    }

    /**
     * Sends an email using PHPMailer.
     *
     * @param string|array $to The recipient(s) of the email.
     * @param string $subject The subject of the email.
     * @param string $message The body of the email.
     * @param string $filename The path to the file to be attached (optional).
     * @return bool True if the email is sent successfully, false otherwise.
     */
    public function sendMail($to, $subject, $message, string $filename = ''): bool
    {
        if (!$this->enableNotifications) {
            return false;
        }
        $messages = [];
        try {
            $mail = $this->getMailSender();
            $mail->setFrom($this->fromAddres, $this->fromName);
            if (is_string($to)) {
                $to = explode(',', $to);
            }
            foreach ($to as $email) {
                $mail->addAddress($email);
            }
            if (file_exists($filename)) {
                $mail->addAttachment($filename);
            }
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $message;

            if (!self::checkConnection(self::TYPE_PHP_MAILER)) {
                return false;
            }
            if (!$mail->send()) {
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
     * Returns an initialized PHPMailer object.
     * @return PHPMailer
     */
    public function getMailSender(): PHPMailer
    {
        $mail = new PHPMailer();
        $mail->isSMTP();
        $mail->SMTPDebug = 0;
        $mail->Timeout = 5;
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
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true,
                    ],
                ];
            }
        }
        $mail->Port = (integer)$this->settings['MailSMTPPort'];
        $mail->CharSet = 'UTF-8';

        return $mail;
    }

    /**
     * Tests the connection to the PHPMailer mail server.
     * @return bool True if the connection is successful, false otherwise.
     */
    public function testConnectionPHPMailer(): bool
    {
        $mail = $this->getMailSender();
        try {
            $result = $mail->smtpConnect();
        } catch (\Exception $e) {
            $result = false;
        }
        return $result;
    }
}
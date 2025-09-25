<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di\Di;
use PHPMailer\PHPMailer\PHPMailer;
use Throwable;

/**
 * Class Notifications
 *
 * @package MikoPBX\Core\System
 */
class Notifications
{
    public const string TYPE_PHP_MAILER = 'PHP_MAILER';
    private bool $enableNotifications;
    private string $fromAddres;
    private string $fromName;

    /**
     * Notifications constructor.
     */
    public function __construct()
    {
        $this->enableNotifications = PbxSettings::getValueByKey(PbxSettings::MAIL_ENABLE_NOTIFICATIONS) === '1';

        $mailSMTPSenderAddress = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
        if (!empty($mailSMTPSenderAddress)) {
            $this->fromAddres = $mailSMTPSenderAddress;
        } else {
            $this->fromAddres = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME);
        }

        if (empty(PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_FROM_USERNAME))) {
            $this->fromName = 'MikoPBX notification';
        } else {
            $this->fromName = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_FROM_USERNAME);
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
     * @param array $subject The subject of the notification.
     * @param array $messages An array of messages to be included in the notification.
     * @param bool $urgent (optional) Set to true for urgent notifications to bypass caching.
     *
     * @return void
     */
    public static function sendAdminNotification(array $subject, array $messages, bool $urgent = false): void
    {
        // Prevent sending the same message twice.
        $di = Di::getDefault();
        if (!$di) {
            return;
        }
        $adminMail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = 'SendAdminNotification:' . md5($adminMail . json_encode($subject) . json_encode($messages));
        $cacheTime = 3600 * 24; // 1 day

        SystemMessages::sysLogMsg(__METHOD__, 'Sending admin notification: ' . json_encode($messages), LOG_DEBUG);

        // Check if the message is not urgent and has been sent recently from cache.
        if (!$urgent &&  $managedCache->has($cacheKey)) {
            return;
        }

        // Translate the subject and messages to the desired language.
        $subject = Util::translate($subject['messageTpl'], false, $subject['messageParams'] ?? []);
        $text = '';
        foreach ($messages as $message) {
            if (is_array($message)) {
                $text .= '<br>' . Util::translate($message['messageTpl'], false, $message['messageParams'] ?? []);
            } else {
                $text .= '<br>' . Util::translate($message, false);
            }
        }
        $text .= '<br><br>' . SystemMessages::getInfoMessage("The MikoPBX connection information");
        $text = str_replace(PHP_EOL, '<br>', $text);

        // Get the admin email address from PbxSettings.
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
        $systemNotificationsEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);
        $result = $this->sendMail($systemNotificationsEmail, 'Test mail from MIKO PBX', '<b>Test message</b><hr>');
        return ($result === true);
    }

    /**
     * Checks the connection to the specified type of mail server.
     * @param string $type The type of mail server.
     * @return bool True if the connection is successful, false otherwise.
     */
    public static function checkConnection(string $type): bool
    {
        $timeoutPath = Util::which('timeout');
        $phpPath = Util::which('php');
        $result = Processes::mwExec("$timeoutPath 5 $phpPath -f /etc/rc/emailTestConnection.php " . $type);
        if ($result !== 0) {
            SystemMessages::sysLogMsg('PHPMailer', 'Error connect to SMTP server... (' . $type . ')', LOG_ERR);
        }

        return ($result === 0);
    }

    /**
     * Sends an email using PHPMailer.
     *
     * @param array|string $to The recipient(s) of the email.
     * @param string $subject The subject of the email.
     * @param string $message The body of the email.
     * @param string $filename The path to the file to be attached (optional).
     * @param string|null &$errorInfo Reference to store PHPMailer error info
     * @return bool True if the email is sent successfully, false otherwise.
     */
    public function sendMail(array|string $to, string $subject, string $message, string $filename = '', ?string &$errorInfo = null): bool
    {
        if (!$this->enableNotifications) {
            $errorInfo = 'Email notifications are disabled';
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
                $errorInfo = 'Could not establish SMTP connection';
                return false;
            }
            if (!$mail->send()) {
                $messages[] = $mail->ErrorInfo;
                $errorInfo = $mail->ErrorInfo;
            }
        } catch (Throwable $e) {
            $messages[] = CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $errorInfo = $e->getMessage();
            if (isset($mail) && $mail->ErrorInfo) {
                $errorInfo .= ' | PHPMailer: ' . $mail->ErrorInfo;
            }
        }
        if (!empty($messages)) {
            SystemMessages::sysLogMsg('PHPMailer', implode(' ', $messages), LOG_ERR);
            return false;
        }
        return true;
    }

    /**
     * Returns an initialized PHPMailer object.
     * @return PHPMailer
     */
    public function getMailSender(): PHPMailer
    {
        // Check authentication type
        $authType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_AUTH_TYPE);

        if ($authType === 'oauth2') {
            return $this->getOAuth2MailSender();
        }

        // Default password-based authentication
        return $this->getPasswordMailSender();
    }

    /**
     * Returns PHPMailer with OAuth2 authentication
     * @return PHPMailer
     */
    private function getOAuth2MailSender(): PHPMailer
    {
        $mail = new PHPMailer();
        $mail->isSMTP();
        $mail->SMTPDebug = 0;
        $mail->Timeout = 5;
        $mail->Host = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_HOST);
        $mail->Port = (int)PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PORT);
        $mail->CharSet = 'UTF-8';

        // OAuth2 authentication
        $mail->SMTPAuth = true;
        $mail->AuthType = 'XOAUTH2';

        // Configure encryption with backward compatibility
        $encryptionType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USE_TLS);
        switch ($encryptionType) {
            case 'ssl':
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                break;
            case 'tls':
            case '1': // Backward compatibility - old value "1" means STARTTLS
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                break;
            case 'none':
            case '0': // Backward compatibility - old value "0" means no encryption
            case '':
            default:
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
                break;
        }

        // Set OAuth2 configuration
        $provider = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);
        SystemMessages::sysLogMsg('PHPMailer', "Configuring OAuth2 for provider: {$provider}", LOG_INFO);

        $oauth = MailOAuth2Service::getOAuthConfig($provider);

        if ($oauth !== null) {
            $mail->setOAuth($oauth);
            // Set username for OAuth2 - use SMTP username or fall back to sender address
            $username = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME);
            if (empty($username)) {
                $username = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
            }
            $mail->Username = $username;
            SystemMessages::sysLogMsg('PHPMailer', "OAuth2 configured for {$mail->Username} on {$mail->Host}:{$mail->Port}", LOG_INFO);
        } else {
            SystemMessages::sysLogMsg('PHPMailer', 'Failed to configure OAuth2 - getOAuthConfig returned null', LOG_ERR);
        }

        // SSL options
        if (PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_CERT_CHECK) !== '1') {
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        return $mail;
    }

    /**
     * Returns PHPMailer with password authentication
     * @return PHPMailer
     */
    private function getPasswordMailSender(): PHPMailer
    {
        $mail = new PHPMailer();
        $mail->isSMTP();
        $mail->SMTPDebug = 0;
        $mail->Timeout = 5;
        $mail->Host = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_HOST);

        // Configure encryption with backward compatibility
        $encryptionType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USE_TLS);
        switch ($encryptionType) {
            case 'ssl':
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                break;
            case 'tls':
            case '1': // Backward compatibility - old value "1" means STARTTLS
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                break;
            case 'none':
            case '0': // Backward compatibility - old value "0" means no encryption
            case '':
            default:
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
                break;
        }
        if (empty(PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME)) && empty(PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PASSWORD))) {
            $mail->SMTPAuth = false;
        } else {
            $mail->SMTPAuth = true;
            $mail->Username = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME);
            $mail->Password = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PASSWORD);
            if (PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_CERT_CHECK) !== '1') {
                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true,
                    ],
                ];
            }
        }
        $mail->Port = (int)PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PORT);
        $mail->CharSet = 'UTF-8';

        return $mail;
    }

    /**
     * Tests the connection to the PHPMailer mail server.
     * @param string|null &$errorInfo Reference to store PHPMailer error info
     * @return bool True if the connection is successful, false otherwise.
     */
    public function testConnectionPHPMailer(?string &$errorInfo = null): bool
    {
        $mail = $this->getMailSender();

        // Capture debug output for better error analysis
        $debugOutput = '';
        $mail->SMTPDebug = \PHPMailer\PHPMailer\SMTP::DEBUG_CONNECTION;
        $mail->Debugoutput = function($str, $level) use (&$debugOutput) {
            $debugOutput .= $str;
        };

        try {
            $result = $mail->smtpConnect();
            if (!$result) {
                // Construct comprehensive error info
                $errors = [];

                // Add PHPMailer ErrorInfo if available
                if ($mail->ErrorInfo) {
                    $errors[] = $mail->ErrorInfo;
                }

                // Extract useful information from debug output
                if (!empty($debugOutput)) {
                    $debugLines = explode("\n", $debugOutput);
                    foreach ($debugLines as $line) {
                        $line = trim($line);
                        // Look for specific error patterns
                        if (strpos($line, 'SMTP ERROR:') !== false ||
                            strpos($line, 'getaddrinfo') !== false ||
                            strpos($line, 'Connection refused') !== false ||
                            strpos($line, '535') !== false ||
                            strpos($line, 'certificate') !== false) {
                            $errors[] = $line;
                        }
                    }
                }

                // If we have specific errors, use them; otherwise use generic message
                $errorInfo = !empty($errors) ? implode(' | ', $errors) : 'SMTP connection failed - no specific error details available';
            }
        } catch (\Exception $e) {
            $errors = [$e->getMessage()];

            if ($mail->ErrorInfo) {
                $errors[] = 'PHPMailer: ' . $mail->ErrorInfo;
            }

            // Also check debug output for additional context
            if (!empty($debugOutput)) {
                $debugLines = explode("\n", $debugOutput);
                foreach ($debugLines as $line) {
                    $line = trim($line);
                    if (strpos($line, 'SMTP ERROR:') !== false) {
                        $errors[] = $line;
                        break; // Only add the first SMTP ERROR line to avoid redundancy
                    }
                }
            }

            $errorInfo = implode(' | ', $errors);
            SystemMessages::sysLogMsg('PHPMailer', 'SMTP connection test failed: ' . $errorInfo, LOG_ERR);
            $result = false;
        }

        return $result;
    }
}

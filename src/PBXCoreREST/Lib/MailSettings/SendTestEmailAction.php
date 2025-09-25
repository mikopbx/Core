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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\MailSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Notifications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;

/**
 * SendTestEmailAction - sends a test email
 *
 * Sends a test email to verify that email configuration is working
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class SendTestEmailAction
{
    /**
     * Send test email
     *
     * @param array<string, mixed> $data Request parameters with optional 'to', 'subject', 'body'
     * @return PBXApiResult Result with send status
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get translation service
        $di = \Phalcon\Di\Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);

        // Collect diagnostic information
        $diagnostics = [];
        $diagnostics['smtp_host'] = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_HOST);
        $diagnostics['smtp_port'] = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PORT);
        $diagnostics['auth_type'] = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_AUTH_TYPE);

        try {
            // Get recipient email
            $to = $data['to'] ?? PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);
            if (empty($to)) {
                $res->messages['error'][] = $translation->_('ms_ValidateSystemEmailInvalid');
                $res->data = [
                    'sent' => false,
                    'diagnostics' => $diagnostics,
                    'error' => 'No recipient email address configured'
                ];
                return $res;
            }

            // Set default subject and body
            $subject = $data['subject'] ?? $translation->_('ms_TestEmailSubject');
            $body = $data['body'] ?? '<h2>' . $translation->_('ms_TestEmailSubject') . '</h2><p>' . $translation->_('ms_TestEmailBody') . '</p>';

            // Add timestamp to body for uniqueness
            $body .= '<hr><p style="color: #888; font-size: 12px;">Sent at: ' . date('Y-m-d H:i:s') . ' (Server Time)</p>';

            SystemMessages::sysLogMsg('SendTestEmailAction', "Sending test email to: $to", LOG_INFO);

            // For test emails, we bypass the enableNotifications check
            // by using a special instance with notifications always enabled
            $testNotifications = new Notifications();

            // Use reflection to temporarily enable notifications for test
            $reflection = new \ReflectionClass($testNotifications);
            $property = $reflection->getProperty('enableNotifications');
            $property->setAccessible(true);
            $property->setValue($testNotifications, true);

            $phpMailerError = null;
            $result = $testNotifications->sendMail($to, $subject, $body, '', $phpMailerError);

            if ($result) {
                $res->success = true;

                // Always include email address in the success message for clarity
                $baseMessage = $translation->_('ms_TestEmailSentSuccessfully');
                if ($baseMessage === 'ms_TestEmailSentSuccessfully') {
                    // Translation not found, use fallback
                    $baseMessage = 'Письмо отправлено';
                }

                // Add recipient email address to the message
                if (!empty($to)) {
                    $res->messages['success'][] = "$baseMessage → $to";
                } else {
                    $res->messages['success'][] = $baseMessage;
                }

                $res->data = [
                    'sent' => true,
                    'to' => $to,
                    'diagnostics' => $diagnostics
                ];

                SystemMessages::sysLogMsg('SendTestEmailAction', "Test email sent successfully to: $to", LOG_INFO);
            } else {
                $res->success = false;

                // Use PHPMailer error if available, otherwise use generic message
                if ($phpMailerError) {
                    $res->messages['error'][] = $phpMailerError;
                } else {
                    $res->messages['error'][] = $translation->_('ms_FailedToSendTestEmail');
                }

                // Add troubleshooting hints
                $hints = [];
                $senderAddress = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
                if (empty($senderAddress)) {
                    $hints[] = 'Configure sender email address';
                }
                if ($diagnostics['auth_type'] === 'oauth2') {
                    // Check OAuth2 specifics
                    $clientSecret = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET);
                    if ($clientSecret === '********' || preg_match('/^\*+$/', $clientSecret)) {
                        $hints[] = 'OAuth2 Client Secret appears to be masked - please re-enter';
                    }

                    $refreshToken = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN);
                    if (empty($refreshToken)) {
                        $hints[] = 'OAuth2 not authorized - please complete authorization';
                    }
                }

                $res->data = [
                    'sent' => false,
                    'to' => $to,
                    'diagnostics' => $diagnostics
                ];

                // Only add hints if there are any
                if (!empty($hints)) {
                    $res->data['hints'] = $hints;
                }

                SystemMessages::sysLogMsg('SendTestEmailAction', 'Failed to send test email. Diagnostics: ' . json_encode($diagnostics), LOG_WARNING);
            }

        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();

            $res->data = [
                'sent' => false,
                'diagnostics' => $diagnostics
            ];

            SystemMessages::sysLogMsg('SendTestEmailAction', 'Exception while sending test email: ' . $e->getMessage(), LOG_ERR);
        }

        return $res;
    }
}
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

            // Create enhanced test email body with system information
            if (empty($data['body'])) {
                $body = self::generateEnhancedTestEmail($translation);
            } else {
                $body = $data['body'];
            }

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

                // Analyze PHPMailer error for more specific diagnostics
                $errorAnalysis = TestConnectionAction::analyzePhpMailerError($phpMailerError, $diagnostics['auth_type'], $translation);

                // Use PHPMailer error if available, otherwise use generic message
                if ($phpMailerError) {
                    $res->messages['error'][] = $phpMailerError;
                } else {
                    $res->messages['error'][] = $translation->_('ms_FailedToSendTestEmail');
                }

                // Add detailed error analysis
                if ($errorAnalysis['detailed_error']) {
                    $res->messages['error'][] = $errorAnalysis['detailed_error'];
                }

                // Add troubleshooting hints from error analysis
                $hints = $errorAnalysis['hints'];

                // Add additional troubleshooting hints specific to test email sending
                $senderAddress = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
                if (empty($senderAddress)) {
                    $hints[] = $translation->_('ms_ValidateSenderAddressEmpty');
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
                    'diagnostics' => $diagnostics,
                    'error_details' => [
                        'raw_error' => $phpMailerError,
                        'error_type' => $errorAnalysis['error_type'],
                        'probable_cause' => $errorAnalysis['probable_cause']
                    ]
                ];

                // Only add hints if there are any
                if (!empty($hints)) {
                    $res->data['hints'] = $hints;
                }

                SystemMessages::sysLogMsg('SendTestEmailAction', 'Failed to send test email. Error: ' . $phpMailerError . '. Analysis: ' . json_encode($errorAnalysis), LOG_WARNING);
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

    /**
     * Generate enhanced test email content with system information
     *
     * @param mixed $translation Translation service instance
     * @return string HTML email content
     */
    private static function generateEnhancedTestEmail($translation): string
    {
        // Get basic system information
        $stationName = PbxSettings::getValueByKey(PbxSettings::PBX_NAME) ?: 'MikoPBX';
        $stationDescription = PbxSettings::getValueByKey(PbxSettings::PBX_DESCRIPTION);
        $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT) ?: '80';
        $webHttpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

        // Get mail configuration (non-sensitive)
        $smtpHost = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_HOST);
        $smtpPort = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PORT);
        $authType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_AUTH_TYPE);
        $senderAddress = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
        $useTLS = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USE_TLS) === '1' ? 'Yes' : 'No';

        // Get OAuth2 provider if applicable
        $oauth2Provider = '';
        if ($authType === 'oauth2') {
            $oauth2Provider = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);
            $oauth2Provider = $oauth2Provider ? ucfirst($oauth2Provider) : 'Unknown';
        }

        // Get network information
        $extIpAddress = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        $hostname = gethostname() ?: 'Unknown';

        // Get current time
        $currentTime = date('Y-m-d H:i:s T');

        // Build HTML email
        $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MikoPBX Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📧 MikoPBX: ' . $translation->_('ms_TestEmailSubject') . '</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">' . $translation->_('ms_TestEmailBody') . '</p>
    </div>
    <div style="background: white; padding: 20px; border: 1px solid #dee2e6;">
        <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">📊 PBX System Information</h3>

        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold; width: 30%;">Station Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($stationName) . '</td>
            </tr>';

        if (!empty($stationDescription)) {
            $html .= '
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Description:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($stationDescription) . '</td>
            </tr>';
        }

        $html .= '
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Hostname:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($hostname) . '</td>
            </tr>';

        if (!empty($extIpAddress)) {
            $html .= '
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">External IP:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($extIpAddress) . '</td>
            </tr>';
        }

        $html .= '
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Web Ports:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">HTTP: ' . htmlspecialchars($webPort) . ', HTTPS: ' . htmlspecialchars($webHttpsPort) . '</td>
            </tr>';

        $html .= '
        </table>
    </div>

    <div style="background: white; padding: 20px; border: 1px solid #dee2e6; margin-top: 1px;">
        <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">📮 Email Configuration</h3>

        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold; width: 30%;">SMTP Server:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($smtpHost) . ':' . htmlspecialchars($smtpPort) . '</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Authentication:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . strtoupper($authType) . ($oauth2Provider ? ' (' . $oauth2Provider . ')' : '') . '</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Sender Address:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">' . htmlspecialchars($senderAddress) . '</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-weight: bold;">Encryption:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;">TLS: ' . $useTLS . '</td>
            </tr>
        </table>
    </div>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; color: #6c757d; font-size: 12px;">
        <p style="margin: 0;">📅 Sent on ' . htmlspecialchars($currentTime) . '</p>
        <p style="margin: 5px 0 0 0;">Generated by MikoPBX Email System Test</p>
    </div>
</body>
</html>';

        return $html;
    }
}
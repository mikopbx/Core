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

use MikoPBX\Core\System\Notifications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;

/**
 * TestConnectionAction - tests SMTP server connection
 *
 * Tests the connection to the configured SMTP server with current settings
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class TestConnectionAction
{
    /**
     * Test SMTP connection
     *
     * @param array<string, mixed> $data Request parameters (unused)
     * @return PBXApiResult Result with connection test status
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
        $diagnostics['smtp_encryption'] = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USE_TLS);

        // Get current settings
        $authType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_AUTH_TYPE);
        $diagnostics['auth_type'] = $authType;

        if ($authType === 'oauth2') {
            $diagnostics['oauth2_provider'] = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);
            $diagnostics['oauth2_client_id'] = substr(PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_ID), 0, 20) . '...';

            // Check OAuth2 tokens
            $refreshToken = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN);
            $diagnostics['oauth2_refresh_token_exists'] = !empty($refreshToken);

            $accessToken = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN);
            $diagnostics['oauth2_access_token_exists'] = !empty($accessToken);

            // Only show token expiration in diagnostics if there's an issue
            // If connection works, refresh token is handling it automatically
            $tokenExpires = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES);
            if (!empty($tokenExpires)) {
                $isExpired = (int)$tokenExpires < time();
                // We'll add this info later only if connection fails
                $tokenExpiryInfo = [
                    'expires' => date('Y-m-d H:i:s', (int)$tokenExpires),
                    'is_expired' => $isExpired
                ];
            }

            // Check Client Secret (important for OAuth2)
            $clientSecret = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET);
            if ($clientSecret === '********' || preg_match('/^\*+$/', $clientSecret)) {
                $diagnostics['oauth2_client_secret_masked'] = true;
                $diagnostics['oauth2_client_secret_warning'] = 'Client Secret appears to be masked - please re-enter actual value';
            } else {
                $diagnostics['oauth2_client_secret_length'] = strlen($clientSecret);
            }
        } else {
            $diagnostics['smtp_username'] = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME);
            $password = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_PASSWORD);
            $diagnostics['smtp_password_exists'] = !empty($password);
        }

        try {
            SystemMessages::sysLogMsg('TestConnectionAction', 'Testing SMTP connection with settings: ' . json_encode($diagnostics), LOG_INFO);

            $notifications = new Notifications();
            $phpMailerError = null;
            $result = $notifications->testConnectionPHPMailer($phpMailerError);

            if ($result) {
                $res->success = true;
                $res->messages['success'][] = $translation->_('ms_SMTPConnectionTestSuccessful');
                $res->data = [
                    'connected' => true,
                    'diagnostics' => $diagnostics
                ];

                SystemMessages::sysLogMsg('TestConnectionAction', 'SMTP connection successful', LOG_INFO);
            } else {
                $res->success = false;

                // Use PHPMailer error if available, otherwise use generic message
                if ($phpMailerError) {
                    $res->messages['error'][] = $phpMailerError;
                } else {
                    $res->messages['error'][] = $translation->_('ms_FailedToConnectToSMTPServer');
                }

                // Add specific troubleshooting hints based on diagnostics
                $hints = [];
                // Add token expiry info to diagnostics only on failure
                if ($authType === 'oauth2' && isset($tokenExpiryInfo)) {
                    $diagnostics['oauth2_token_expires'] = $tokenExpiryInfo['expires'];
                    $diagnostics['oauth2_token_expired'] = $tokenExpiryInfo['is_expired'];

                    if ($tokenExpiryInfo['is_expired']) {
                        $hints[] = 'OAuth2 access token expired - if refresh token is invalid, try re-authorizing';
                    }
                }

                if ($authType === 'oauth2' && !empty($diagnostics['oauth2_client_secret_masked'])) {
                    $hints[] = 'Client Secret may be invalid - please check Google Cloud Console';
                }
                if ($diagnostics['smtp_port'] === '465' && $diagnostics['smtp_encryption'] !== 'ssl') {
                    $hints[] = 'Port 465 typically requires SSL encryption';
                }
                if ($diagnostics['smtp_port'] === '587' && $diagnostics['smtp_encryption'] !== 'tls') {
                    $hints[] = 'Port 587 typically requires TLS/STARTTLS encryption';
                }

                $res->data = [
                    'connected' => false,
                    'diagnostics' => $diagnostics
                ];

                // Only add hints if there are any
                if (!empty($hints)) {
                    $res->data['hints'] = $hints;
                }

                SystemMessages::sysLogMsg('TestConnectionAction', 'SMTP connection failed with diagnostics: ' . json_encode($diagnostics), LOG_WARNING);
            }

        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();

            $res->data = [
                'connected' => false,
                'diagnostics' => $diagnostics
            ];

            SystemMessages::sysLogMsg('TestConnectionAction', 'SMTP connection exception: ' . $e->getMessage(), LOG_ERR);
        }

        return $res;
    }
}
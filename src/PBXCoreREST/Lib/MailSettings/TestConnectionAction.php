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

                // Analyze PHPMailer error for more specific diagnostics
                $errorAnalysis = self::analyzePhpMailerError($phpMailerError, $authType, $translation);

                // Use PHPMailer error if available, otherwise use generic message
                if ($phpMailerError) {
                    $res->messages['error'][] = $phpMailerError;
                } else {
                    $res->messages['error'][] = $translation->_('ms_FailedToConnectToSMTPServer');
                }

                // Add detailed error analysis
                if ($errorAnalysis['detailed_error']) {
                    $res->messages['error'][] = $errorAnalysis['detailed_error'];
                }

                // Add specific troubleshooting hints based on diagnostics
                $hints = $errorAnalysis['hints'];

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

                SystemMessages::sysLogMsg('TestConnectionAction', 'SMTP connection failed. Error: ' . $phpMailerError . '. Analysis: ' . json_encode($errorAnalysis), LOG_WARNING);
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

    /**
     * Analyze PHPMailer error message to provide more specific diagnostics
     *
     * @param string|null $errorMessage PHPMailer error message
     * @param string $authType Authentication type (oauth2 or password)
     * @param mixed $translation Translation service instance
     * @return array{error_type: string, probable_cause: string, detailed_error: string|null, hints: string[]}
     */
    public static function analyzePhpMailerError(?string $errorMessage, string $authType, $translation): array
    {
        $result = [
            'error_type' => 'unknown',
            'probable_cause' => $translation->_('ms_DiagnosticCause_unknown_error'),
            'detailed_error' => null,
            'hints' => []
        ];

        if (empty($errorMessage)) {
            return $result;
        }

        $error = strtolower($errorMessage);

        // DNS resolution errors (common pattern from testing)
        if (strpos($error, 'getaddrinfo') !== false || strpos($error, 'name or service not known') !== false) {
            $result['error_type'] = 'dns_resolution_failed';
            $result['probable_cause'] = $translation->_('ms_DiagnosticCause_dns_resolution_failed');
            $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_dns_lookup_failed');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_smtp_hostname');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_network_connectivity');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_try_ip_instead_hostname');
            return $result;
        }

        // Gmail 535 authentication errors (specific pattern from testing)
        if (strpos($error, '535-5.7.8') !== false && strpos($error, 'badcredentials') !== false) {
            if ($authType === 'oauth2') {
                $result['error_type'] = 'oauth2_auth_failed';
                $result['probable_cause'] = $translation->_('ms_DiagnosticCause_oauth2_gmail_535');
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_gmail_oauth2_535_error');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_check_sender_matches_oauth2');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_oauth2_tokens_valid');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_reauthorize_oauth2');
            } else {
                $result['error_type'] = 'password_auth_failed';
                $result['probable_cause'] = $translation->_('ms_DiagnosticCause_gmail_app_password_required');
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_gmail_535_app_password');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_use_app_specific_password');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_enable_2fa_gmail');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_username_exact_email');
            }
            return $result;
        }

        // Network connection failures
        if (strpos($error, 'failed to connect to server') !== false) {
            $result['error_type'] = 'network_connection_failed';
            $result['probable_cause'] = $translation->_('ms_DiagnosticCause_network_unreachable');
            $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_server_unreachable');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_server_hostname_port');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_network_connectivity');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_firewall_blocking');
            return $result;
        }

        // OAuth2 specific errors
        if ($authType === 'oauth2') {
            if (strpos($error, 'auth') !== false || strpos($error, 'authentication') !== false) {
                $result['error_type'] = 'oauth2_auth_failed';
                $result['probable_cause'] = $translation->_('ms_DiagnosticCause_oauth2_auth_failed');

                if (strpos($error, '535') !== false) {
                    $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_oauth2_535_error');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_check_sender_matches_oauth2');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_client_credentials');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_reauthorize_oauth2');
                } else if (strpos($error, 'invalid_grant') !== false || strpos($error, 'refresh') !== false) {
                    $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_oauth2_refresh_token_invalid');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_reauthorize_oauth2_new_tokens');
                } else if (strpos($error, 'access denied') !== false || strpos($error, 'insufficient') !== false) {
                    $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_oauth2_insufficient_permissions');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_check_gmail_send_as_permission');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_sender_authorized_gmail');
                }
            }
        }

        // Connection errors
        if (strpos($error, 'connection') !== false) {
            $result['error_type'] = 'connection_failed';

            if (strpos($error, 'refused') !== false) {
                $result['probable_cause'] = $translation->_('ms_DiagnosticCause_connection_refused');
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_smtp_connection_refused');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_smtp_hostname');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_check_firewall_blocking');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_ensure_smtp_service_running');
            } else if (strpos($error, 'timeout') !== false) {
                $result['probable_cause'] = $translation->_('ms_DiagnosticCause_connection_timeout');
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_smtp_connection_timeout');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_check_network_connectivity');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_server_overloaded_unreachable');
            } else {
                // Generic connection error - but for OAuth2 it's often auth-related
                if ($authType === 'oauth2') {
                    $result['error_type'] = 'oauth2_auth_failed';
                    $result['probable_cause'] = $translation->_('ms_DiagnosticCause_oauth2_connection_auth');
                    $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_oauth2_connection_auth');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_check_sender_matches_oauth2');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_client_credentials');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_reauthorize_oauth2');
                } else {
                    $result['probable_cause'] = $translation->_('ms_DiagnosticCause_connection_failed');
                    $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_smtp_connection_failed');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_smtp_hostname');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_check_network_connectivity');
                    $result['hints'][] = $translation->_('ms_DiagnosticHint_check_firewall_blocking');
                }
            }
        }

        // SSL/TLS errors
        if (strpos($error, 'ssl') !== false || strpos($error, 'tls') !== false || strpos($error, 'certificate') !== false) {
            $result['error_type'] = 'encryption_failed';
            $result['probable_cause'] = $translation->_('ms_DiagnosticCause_ssl_tls_failed');

            if (strpos($error, 'certificate') !== false) {
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_ssl_certificate_failed');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_disable_ssl_verification');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_check_valid_ssl_certificate');
            } else if (strpos($error, 'handshake') !== false) {
                $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_ssl_handshake_failed');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_check_encryption_type_matches');
                $result['hints'][] = $translation->_('ms_DiagnosticHint_try_different_encryption');
            }
        }

        // Authentication errors (password-based)
        if (strpos($error, '535') !== false && $authType !== 'oauth2') {
            $result['error_type'] = 'password_auth_failed';
            $result['probable_cause'] = $translation->_('ms_DiagnosticCause_password_incorrect');
            $result['detailed_error'] = $translation->_('ms_DiagnosticDetail_smtp_auth_535_error');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_verify_username_password');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_app_specific_password');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_ensure_smtp_auth_allowed');
        }

        // Port/protocol errors
        if (strpos($error, 'protocol') !== false || preg_match('/\b(25|465|587)\b/', $errorMessage)) {
            $result['error_type'] = 'protocol_mismatch';
            $result['probable_cause'] = $translation->_('ms_DiagnosticCause_wrong_port_encryption');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_port_matches_encryption');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_common_port_combinations');
        }

        // Gmail specific hints for OAuth2
        if ($authType === 'oauth2' && (strpos($error, 'gmail') !== false || strpos($error, 'google') !== false)) {
            $result['hints'][] = $translation->_('ms_DiagnosticHint_gmail_sender_must_match');
            $result['hints'][] = $translation->_('ms_DiagnosticHint_check_send_mail_as_settings');
        }

        return $result;
    }
}
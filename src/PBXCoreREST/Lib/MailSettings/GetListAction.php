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
use MikoPBX\PBXCoreREST\Lib\Common\FieldTypeResolver;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetListAction - retrieves all mail settings
 *
 * Returns all mail-related settings with sensitive data masked
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class GetListAction
{
    /**
     * Get all mail settings
     *
     * @param array<string, mixed> $data Request parameters (unused for getList)
     * @return PBXApiResult Result containing all mail settings
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Define all mail-related setting keys
            $mailSettingKeys = [
                // Basic SMTP settings
                PbxSettings::MAIL_SMTP_HOST,
                PbxSettings::MAIL_SMTP_PORT,
                PbxSettings::MAIL_SMTP_USERNAME,
                PbxSettings::MAIL_SMTP_PASSWORD,
                PbxSettings::MAIL_SMTP_USE_TLS,
                PbxSettings::MAIL_SMTP_CERT_CHECK,
                PbxSettings::MAIL_SMTP_FROM_USERNAME,
                PbxSettings::MAIL_SMTP_SENDER_ADDRESS,
                PbxSettings::MAIL_ENABLE_NOTIFICATIONS,

                // OAuth2 settings
                PbxSettings::MAIL_SMTP_AUTH_TYPE,
                PbxSettings::MAIL_OAUTH2_PROVIDER,
                PbxSettings::MAIL_OAUTH2_CLIENT_ID,
                PbxSettings::MAIL_OAUTH2_CLIENT_SECRET,
                PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN,
                PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN,
                PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES,

                // Email templates
                PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT,
                PbxSettings::MAIL_TPL_MISSED_CALL_BODY,
                PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER,
                PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT,
                PbxSettings::MAIL_TPL_VOICEMAIL_BODY,
                PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER,

                // Notification emails
                PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL,
                PbxSettings::SYSTEM_EMAIL_FOR_MISSED,
                PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL
            ];

            // Retrieve settings
            $settings = [];
            foreach ($mailSettingKeys as $key) {
                $value = PbxSettings::getValueByKey($key);

                // Mask sensitive data
                if (self::isSensitiveField($key) && !empty($value)) {
                    $value = self::maskSensitiveData($key, $value);
                } else {
                    // Convert to API format based on field type (boolean fields become true/false)
                    $value = FieldTypeResolver::convertToApiFormat($value, PbxSettings::class, $key);
                }

                $settings[$key] = $value;
            }

            // Add OAuth2 status information
            $settings['oauth2_status'] = self::getOAuth2Status();

            $res->data = $settings;
            $res->success = true;
            $res->messages['info'][] = 'Mail settings retrieved successfully';

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Check if a field contains sensitive data
     *
     * @param string $key Setting key
     * @return bool True if field is sensitive
     */
    private static function isSensitiveField(string $key): bool
    {
        $sensitiveFields = [
            PbxSettings::MAIL_SMTP_PASSWORD,
            PbxSettings::MAIL_OAUTH2_CLIENT_SECRET,
            PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN,
            PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN
        ];

        return in_array($key, $sensitiveFields, true);
    }

    /**
     * Mask sensitive data for display
     *
     * @param string $key Setting key
     * @param string $value Original value
     * @return string Masked value
     */
    private static function maskSensitiveData(string $key, string $value): string
    {
        // For passwords and tokens, show only that they are set
        if (in_array($key, [
            PbxSettings::MAIL_SMTP_PASSWORD,
            PbxSettings::MAIL_OAUTH2_CLIENT_SECRET
        ])) {
            return '********';
        }

        // For tokens, show first and last few characters
        if (strlen($value) > 10) {
            return substr($value, 0, 4) . '...' . substr($value, -4);
        }

        return '***';
    }

    /**
     * Get OAuth2 authentication status
     *
     * @return array OAuth2 status information
     */
    private static function getOAuth2Status(): array
    {
        $authType = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_AUTH_TYPE);

        if ($authType !== 'oauth2') {
            return [
                'enabled' => false,
                'configured' => false
            ];
        }

        $refreshToken = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN);

        // If we have a refresh token, OAuth2 is authorized
        // The access token will be automatically refreshed when needed
        // So we don't show "expired" status to avoid confusion
        $status = [
            'enabled' => true,
            'configured' => !empty($refreshToken),
            'provider' => PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER)
        ];

        // Only include token_valid for debugging purposes if explicitly needed
        // Since refresh token auto-refreshes, showing "expired" is misleading
        if (!empty($refreshToken)) {
            $status['authorized'] = true;
            // Don't include token_valid to avoid showing "expired" when system works fine
        }

        return $status;
    }
}
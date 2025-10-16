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
use MikoPBX\Core\System\Mail\MailOAuth2Service;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetOAuth2UrlAction - generates OAuth2 authorization URL
 *
 * Generates the OAuth2 authorization URL for the specified provider
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class GetOAuth2UrlAction
{
    /**
     * Get OAuth2 authorization URL
     *
     * @param array<string, mixed> $data Request parameters with 'provider' field
     * @return PBXApiResult Result with authorization URL
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get provider from request or settings
            $provider = $data['provider'] ?? PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);

            if (empty($provider)) {
                $res->messages['error'][] = 'OAuth2 provider not specified';
                return $res;
            }

            // Validate provider
            if (!in_array($provider, ['google', 'microsoft', 'yandex'], true)) {
                $res->messages['error'][] = "Unsupported OAuth2 provider: $provider";
                return $res;
            }

            // Check if OAuth2 credentials are configured
            $clientId = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_ID);
            $clientSecret = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET);

            if (empty($clientId) || empty($clientSecret)) {
                $res->messages['error'][] = 'OAuth2 client credentials not configured. Please set Client ID and Client Secret in settings.';
                return $res;
            }

            // Generate authorization URL
            $authUrl = MailOAuth2Service::generateAuthUrl($provider);

            if (empty($authUrl)) {
                $res->messages['error'][] = 'Failed to generate OAuth2 authorization URL';
                return $res;
            }

            $res->success = true;
            $res->data = [
                'auth_url' => $authUrl,
                'provider' => $provider,
                'info' => self::getProviderInfo($provider)
            ];
            $res->messages['info'][] = 'OAuth2 authorization URL generated successfully';

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to generate OAuth2 URL: ' . $e->getMessage();
        }

        return $res;
    }

    /**
     * Get provider-specific information
     *
     * @param string $provider Provider name
     * @return array Provider information
     */
    private static function getProviderInfo(string $provider): array
    {
        $info = [
            'google' => [
                'name' => 'Google/Gmail',
                'scopes' => ['https://mail.google.com/'],
                'note' => 'Requires Gmail API to be enabled in Google Cloud Console'
            ],
            'microsoft' => [
                'name' => 'Microsoft/Outlook',
                'scopes' => ['https://outlook.office365.com/.default'],
                'note' => 'Requires SMTP.SendAsApp permission in Azure AD'
            ],
            'yandex' => [
                'name' => 'Yandex Mail',
                'scopes' => ['mail:smtp'],
                'note' => 'Requires SMTP permission in Yandex OAuth app'
            ]
        ];

        return $info[$provider] ?? [];
    }
}
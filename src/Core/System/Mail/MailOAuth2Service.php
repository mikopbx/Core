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

namespace MikoPBX\Core\System\Mail;

use League\OAuth2\Client\Provider\AbstractProvider;
use League\OAuth2\Client\Provider\GenericProvider;
use League\OAuth2\Client\Provider\Google;
use League\OAuth2\Client\Token\AccessTokenInterface;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use PHPMailer\PHPMailer\OAuth;
use Phalcon\Di\Di;

/**
 * Class MailOAuth2Service
 *
 * Service for managing OAuth2 authentication for mail services
 *
 * @package MikoPBX\Core\System
 */
class MailOAuth2Service
{
    private const STATE_SETTING_KEY = 'MailOAuth2State';
    private const STATE_EXPIRY_KEY = 'MailOAuth2StateExpiry';
    private const STATE_TTL = 600; // 10 minutes TTL for state

    /**
     * Detect email provider from email address
     *
     * @param string $email Email address
     * @return string Provider name (google|microsoft|yandex|custom)
     */
    public static function detectProvider(string $email): string
    {
        $email = strtolower($email);

        if (str_contains($email, '@gmail.com') || str_contains($email, '@googlemail.com')) {
            return 'google';
        } elseif (str_contains($email, '@outlook.') || str_contains($email, '@hotmail.') || str_contains($email, '@live.')) {
            return 'microsoft';
        } elseif (str_contains($email, '@yandex.') || str_contains($email, '@ya.ru')) {
            return 'yandex';
        }

        return 'custom';
    }

    /**
     * Generate OAuth2 authorization URL
     *
     * @param string $provider Provider name
     * @param string|null $origin Origin URL from HTTP context (e.g., "https://pbx.example.com:8443")
     * @return string Authorization URL
     */
    public static function generateAuthUrl(string $provider, ?string $origin = null): string
    {
        try {
            $providerInstance = self::getProvider($provider, $origin);

            if ($providerInstance === null) {
                return '';
            }

            // Generate authorization URL
            $authUrl = $providerInstance->getAuthorizationUrl(self::getAuthOptions($provider));

            // Save state for CSRF protection at system level
            $state = $providerInstance->getState();

            // Save state to database for system-level storage
            self::saveOAuth2State($state);

            return $authUrl;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to generate OAuth2 URL: ' . $e->getMessage(), LOG_ERR);
            return '';
        }
    }

    /**
     * Handle OAuth2 callback
     *
     * @param array $params Callback parameters (code, state)
     * @return bool Success status
     */
    public static function handleCallback(array $params): bool
    {
        try {
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 callback started with state: ' . ($params['state'] ?? 'empty'), LOG_INFO);

            // Verify state for CSRF protection from system storage
            if (!self::verifyOAuth2State($params['state'] ?? '')) {
                SystemMessages::sysLogMsg(__METHOD__, 'Invalid OAuth2 state: ' . ($params['state'] ?? 'empty'), LOG_ERR);
                return false;
            }

            // Get provider
            $provider = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);
            SystemMessages::sysLogMsg(__METHOD__, "OAuth2 provider: {$provider}", LOG_INFO);

            $providerInstance = self::getProvider($provider);

            if ($providerInstance === null) {
                SystemMessages::sysLogMsg(__METHOD__, 'Failed to get provider instance', LOG_ERR);
                return false;
            }

            // Exchange code for access token
            SystemMessages::sysLogMsg(__METHOD__, 'Exchanging code for access token', LOG_INFO);
            $accessToken = $providerInstance->getAccessToken('authorization_code', [
                'code' => $params['code']
            ]);

            // Save tokens
            SystemMessages::sysLogMsg(__METHOD__, 'Saving tokens', LOG_INFO);
            return self::saveTokens($accessToken);

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 callback failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString(), LOG_ERR);
            return false;
        }
    }

    /**
     * Refresh OAuth2 access token
     *
     * @return bool Success status
     */
    public static function refreshAccessToken(): bool
    {
        try {
            $refreshToken = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN);

            if (empty($refreshToken)) {
                SystemMessages::sysLogMsg(__METHOD__, 'No refresh token available', LOG_ERR);
                return false;
            }

            $provider = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_PROVIDER);
            $providerInstance = self::getProvider($provider);

            if ($providerInstance === null) {
                return false;
            }

            // Get new access token
            $accessToken = $providerInstance->getAccessToken('refresh_token', [
                'refresh_token' => $refreshToken
            ]);

            // Save new tokens
            return self::saveTokens($accessToken);

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Token refresh failed: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Get OAuth configuration for PHPMailer
     *
     * @param string $provider Provider name
     * @return OAuth|null OAuth instance for PHPMailer
     */
    public static function getOAuthConfig(string $provider): ?OAuth
    {
        try {
            $providerInstance = self::getProvider($provider);

            if ($providerInstance === null) {
                return null;
            }

            // Get username - use SMTP username or fall back to sender address
            $userName = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_USERNAME);
            if (empty($userName)) {
                $userName = PbxSettings::getValueByKey(PbxSettings::MAIL_SMTP_SENDER_ADDRESS);
            }

            $oauth = new OAuth([
                'provider' => $providerInstance,
                'clientId' => PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_ID),
                'clientSecret' => PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET),
                'refreshToken' => PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN),
                'userName' => $userName,
            ]);

            return $oauth;

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to create OAuth config: ' . $e->getMessage(), LOG_ERR);
            return null;
        }
    }

    /**
     * Get OAuth2 provider instance
     *
     * @param string $provider Provider name
     * @param string|null $origin Origin URL from HTTP context for redirect URI generation
     * @return AbstractProvider|null Provider instance
     */
    private static function getProvider(string $provider, ?string $origin = null): ?AbstractProvider
    {
        $clientId = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_ID);
        $clientSecret = PbxSettings::getValueByKey(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET);

        if (empty($clientId) || empty($clientSecret)) {
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 credentials not configured', LOG_ERR);
            return null;
        }

        $redirectUri = self::getRedirectUri($origin);
        SystemMessages::sysLogMsg(__METHOD__, "OAuth2 config - Provider: {$provider}, ClientId: {$clientId}, RedirectUri: {$redirectUri}", LOG_INFO);

        switch ($provider) {
            case 'google':
                return new Google([
                    'clientId' => $clientId,
                    'clientSecret' => $clientSecret,
                    'redirectUri' => $redirectUri,
                    'accessType' => 'offline',
                    'prompt' => 'consent'
                ]);

            case 'microsoft':
                // Using GenericProvider for Microsoft as thenetworg/oauth2-azure requires additional setup
                // Note: scopes are set in getAuthOptions(), not here, to avoid duplication issues
                return new GenericProvider([
                    'clientId' => $clientId,
                    'clientSecret' => $clientSecret,
                    'redirectUri' => $redirectUri,
                    'urlAuthorize' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                    'urlAccessToken' => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                    'urlResourceOwnerDetails' => ''
                ]);

            case 'yandex':
                return new GenericProvider([
                    'clientId' => $clientId,
                    'clientSecret' => $clientSecret,
                    'redirectUri' => $redirectUri,
                    'urlAuthorize' => 'https://oauth.yandex.com/authorize',
                    'urlAccessToken' => 'https://oauth.yandex.com/token',
                    'urlResourceOwnerDetails' => '',
                    'scopes' => ['mail:smtp']
                ]);

            default:
                SystemMessages::sysLogMsg(__METHOD__, "Unsupported provider: $provider", LOG_ERR);
                return null;
        }
    }

    /**
     * Get authorization options for provider
     *
     * @param string $provider Provider name
     * @return array Authorization options
     */
    private static function getAuthOptions(string $provider): array
    {
        $options = [];

        switch ($provider) {
            case 'google':
                $options['scope'] = ['https://mail.google.com/'];
                $options['access_type'] = 'offline';
                $options['prompt'] = 'consent';
                break;

            case 'microsoft':
                // Use delegated SMTP.Send scope for authorization_code flow
                // Note: outlook.office.com (not office365.com) for delegated permissions
                $options['scope'] = ['https://outlook.office.com/SMTP.Send', 'offline_access'];
                break;

            case 'yandex':
                $options['scope'] = ['mail:smtp'];
                break;
        }

        return $options;
    }

    /**
     * Get redirect URI for OAuth2
     *
     * @param string|null $origin Origin URL from HTTP context (e.g., "https://pbx.example.com:8443")
     * @return string Redirect URI
     */
    private static function getRedirectUri(?string $origin = null): string
    {
        // Try to use origin from HTTP context first (passed from controller via worker)
        // This is the most reliable source since it comes from the actual HTTP request
        if (!empty($origin)) {
            // Origin is already in format "https://host:port", just append the callback path
            return rtrim($origin, '/') . '/pbxcore/api/v3/mail-settings/oauth2-callback';
        }

        // Fallback to PBX settings
        $externalHost = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_HOST_NAME);
        if (empty($externalHost)) {
            $externalHost = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        }

        if (empty($externalHost)) {
            // Last resort fallback to current request host if available (unlikely in worker context)
            if (isset($_SERVER['HTTP_HOST'])) {
                $externalHost = $_SERVER['HTTP_HOST'];
            } else {
                $externalHost = '127.0.0.1';
            }
        }

        // Check if host already contains port
        if (!str_contains($externalHost, ':')) {
            // Get HTTPS port setting (OAuth2 callback requires HTTPS)
            $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
            if (!empty($webPort) && $webPort !== '443') {
                $externalHost .= ":{$webPort}";
            }
        }

        return "https://{$externalHost}/pbxcore/api/v3/mail-settings/oauth2-callback";
    }

    /**
     * Save OAuth2 tokens
     *
     * @param AccessTokenInterface $accessToken Access token object
     * @return bool Success status
     */
    private static function saveTokens(AccessTokenInterface $accessToken): bool
    {
        $db = Di::getDefault()->get('db');

        try {
            $db->begin();

            // Save access token
            $setting = PbxSettings::findFirstByKey(PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN) ?? new PbxSettings();
            $setting->key = PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN;
            $setting->value = $accessToken->getToken();
            if (!$setting->save()) {
                $db->rollback();
                return false;
            }

            // Save refresh token if provided
            $refreshToken = $accessToken->getRefreshToken();
            if (!empty($refreshToken)) {
                $setting = PbxSettings::findFirstByKey(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN) ?? new PbxSettings();
                $setting->key = PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN;
                $setting->value = $refreshToken;
                if (!$setting->save()) {
                    $db->rollback();
                    return false;
                }
            }

            // Save token expiration
            $expires = $accessToken->getExpires();
            if ($expires !== null) {
                $setting = PbxSettings::findFirstByKey(PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES) ?? new PbxSettings();
                $setting->key = PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES;
                $setting->value = (string)$expires;
                if (!$setting->save()) {
                    $db->rollback();
                    return false;
                }
            }

            $db->commit();
            return true;

        } catch (\Exception $e) {
            $db->rollback();
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to save tokens: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Save OAuth2 state to system storage
     *
     * @param string $state OAuth2 state value
     * @return bool Success status
     */
    private static function saveOAuth2State(string $state): bool
    {
        try {
            SystemMessages::sysLogMsg(__METHOD__, "Saving OAuth2 state: {$state}", LOG_INFO);

            $db = Di::getDefault()->get('db');
            $db->begin();

            // Save state
            $stateSetting = PbxSettings::findFirstByKey(self::STATE_SETTING_KEY) ?? new PbxSettings();
            $stateSetting->key = self::STATE_SETTING_KEY;
            $stateSetting->value = $state;
            if (!$stateSetting->save()) {
                $errors = implode(', ', $stateSetting->getMessages());
                SystemMessages::sysLogMsg(__METHOD__, "Failed to save state: {$errors}", LOG_ERR);
                $db->rollback();
                return false;
            }

            // Save state expiry time (current time + TTL)
            $expirySetting = PbxSettings::findFirstByKey(self::STATE_EXPIRY_KEY) ?? new PbxSettings();
            $expirySetting->key = self::STATE_EXPIRY_KEY;
            $expirySetting->value = (string)(time() + self::STATE_TTL);
            if (!$expirySetting->save()) {
                $errors = implode(', ', $expirySetting->getMessages());
                SystemMessages::sysLogMsg(__METHOD__, "Failed to save state expiry: {$errors}", LOG_ERR);
                $db->rollback();
                return false;
            }

            $db->commit();
            SystemMessages::sysLogMsg(__METHOD__, "OAuth2 state saved successfully", LOG_INFO);
            return true;

        } catch (\Exception $e) {
            if (isset($db)) {
                $db->rollback();
            }
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to save OAuth2 state: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Verify OAuth2 state from system storage
     *
     * @param string $state OAuth2 state value to verify
     * @return bool Verification status
     */
    private static function verifyOAuth2State(string $state): bool
    {
        if (empty($state)) {
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 state is empty', LOG_WARNING);
            return false;
        }

        try {
            // Get saved state
            $savedState = PbxSettings::getValueByKey(self::STATE_SETTING_KEY);
            SystemMessages::sysLogMsg(__METHOD__, "Comparing states - Received: {$state}, Saved: " . ($savedState ?: 'empty'), LOG_INFO);

            if (empty($savedState) || $savedState !== $state) {
                SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 state mismatch', LOG_WARNING);
                return false;
            }

            // Check if state is expired
            $expiry = PbxSettings::getValueByKey(self::STATE_EXPIRY_KEY);
            $currentTime = time();
            SystemMessages::sysLogMsg(__METHOD__, "State expiry check - Expiry: {$expiry}, Current: {$currentTime}", LOG_INFO);

            if (empty($expiry) || (int)$expiry < $currentTime) {
                SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 state expired', LOG_WARNING);
                self::clearOAuth2State();
                return false;
            }

            // State is valid, clear it (one-time use)
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 state is valid, clearing it', LOG_INFO);
            self::clearOAuth2State();
            return true;

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to verify OAuth2 state: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Clear OAuth2 state from system storage
     *
     * @return bool Success status
     */
    private static function clearOAuth2State(): bool
    {
        try {
            $db = Di::getDefault()->get('db');
            $db->begin();

            // Clear state
            $stateSetting = PbxSettings::findFirstByKey(self::STATE_SETTING_KEY);
            if ($stateSetting) {
                $stateSetting->value = '';
                if (!$stateSetting->save()) {
                    $db->rollback();
                    return false;
                }
            }

            // Clear expiry
            $expirySetting = PbxSettings::findFirstByKey(self::STATE_EXPIRY_KEY);
            if ($expirySetting) {
                $expirySetting->value = '';
                if (!$expirySetting->save()) {
                    $db->rollback();
                    return false;
                }
            }

            $db->commit();
            return true;

        } catch (\Exception $e) {
            if (isset($db)) {
                $db->rollback();
            }
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to clear OAuth2 state: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
}
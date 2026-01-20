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

namespace MikoPBX\PBXCoreREST\Lib\Auth;

use MikoPBX\Common\Library\Auth\CredentialsValidator;
use MikoPBX\Common\Library\Auth\RedisTokenStorage;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use Phalcon\Di\Di;
use Phalcon\Encryption\Security\Random;

/**
 * Login Action - JWT-based authentication
 *
 * Supports two authentication methods:
 * 1. Password authentication (login + password)
 * 2. Passkey authentication (sessionToken from WebAuthn)
 *
 * Returns:
 * - accessToken: JWT token (15 min), send in Authorization: Bearer header
 * - refreshToken: httpOnly cookie (30 days), automatically sent by browser
 *
 * Security features:
 * - Rate limiting (10 attempts per 5 minutes per IP)
 * - Refresh token rotation
 * - Device tracking (IP, User-Agent)
 * - Audit logging
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 */
class LoginAction
{
    /**
     * Maximum login attempts per interval
     */
    private const int MAX_ATTEMPTS = 10;

    /**
     * Interval to reset login attempts (seconds)
     */
    private const int ATTEMPTS_INTERVAL = 300;

    /**
     * Process login request
     *
     * Expects $data to contain:
     * - login/password OR sessionToken (auth methods)
     * - rememberMe (boolean, optional)
     * - clientIp (string, from controller)
     * - userAgent (string, from controller)
     *
     * Returns PBXApiResult with:
     * - data['accessToken'] - JWT access token
     * - data['tokenType'] - "Bearer"
     * - data['expiresIn'] - seconds until expiration
     * - data['login'] - user login
     * - data['_cookieData'] - internal cookie instructions for controller
     *
     * @param array<string, mixed> $data Request data with client info
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Extract client info from data (passed by controller)
        $clientIp = isset($data['clientIp']) && is_string($data['clientIp']) ? $data['clientIp'] : '';
        $userAgent = isset($data['userAgent']) && is_string($data['userAgent']) ? $data['userAgent'] : '';

        // Get services via DI (worker context)
        $di = Di::getDefault();
        if ($di === null) {
            $res->messages['error'][] = 'Dependency injection container not available';
            $res->httpCode = 500;
            return $res;
        }

        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);

        // Check rate limiting
        $remainingAttempts = self::checkRateLimit($clientIp, false, $cache);
        if ($remainingAttempts <= 0) {
            $res->messages['error'][] = TranslationProvider::translate(
                'auth_TooManyLoginAttempts',
                ['interval' => self::ATTEMPTS_INTERVAL]
            );
            $res->httpCode = 429; // Too Many Requests
            return $res;
        }

        // Determine authentication method
        $sessionToken = isset($data['sessionToken']) && is_string($data['sessionToken']) ? $data['sessionToken'] : null;
        $login = isset($data['login']) && is_string($data['login']) ? $data['login'] : null;
        $password = isset($data['password']) && is_string($data['password']) ? $data['password'] : null;
        $rememberMe = ($data['rememberMe'] ?? false) === true;

        $sessionParams = null;

        // Method 1: Passkey authentication via sessionToken
        if ($sessionToken !== null) {
            $sessionParams = self::authenticateWithSessionToken($sessionToken, $cache);
        }
        // Method 2: Password authentication (using shared CredentialsValidator)
        elseif ($login !== null && $password !== null) {
            $security = $di->get('security');
            $sessionParams = CredentialsValidator::authenticate($login, $password, $security);
        }
        else {
            $res->messages['error'][] = TranslationProvider::translate('auth_LoginPasswordRequired');
            $res->httpCode = 400; // Bad Request - missing required parameters
            return $res;
        }

        // Authentication failed
        if ($sessionParams === null) {
            // Increment failed attempt counter
            $remainingAttempts = self::checkRateLimit($clientIp, true, $cache)??10;

            $res->messages['error'][] = TranslationProvider::translate(
                'auth_WrongLoginPassword',
                ['attempts' => $remainingAttempts]
            );
            $res->httpCode = 401; // Unauthorized - invalid credentials
            return $res;
        }

        // Authentication successful - create tokens
        $userId = isset($sessionParams[SessionController::USER_NAME]) && is_string($sessionParams[SessionController::USER_NAME])
            ? $sessionParams[SessionController::USER_NAME]
            : '';

        // Determine language for JWT payload
        // Priority: 1) request parameter, 2) system settings
        $language = isset($data['language']) && is_string($data['language'])
            ? $data['language']
            : \MikoPBX\Common\Models\PbxSettings::getValueByKey(\MikoPBX\Common\Models\PbxSettings::WEB_ADMIN_LANGUAGE);

        // Generate JWT access token
        $accessToken = JWTHelper::generate([
            'userId' => $userId,
            'role' => $sessionParams[SessionController::ROLE] ?? 'user',
            'language' => $language,
        ], JWTHelper::ACCESS_TOKEN_TTL);

        // Generate refresh token
        $random = new Random();
        try {
            $refreshToken = $random->hex(32); // 64 hex characters
        } catch (\Throwable $e) {
            $refreshToken = bin2hex(random_bytes(32));
        }

        // Save refresh token to Redis (fast O(1) storage with automatic TTL)
        $tokenStorage = new RedisTokenStorage($redis);

        $tokenData = array_merge($sessionParams, [
            'userId' => $userId,
            'clientIp' => $clientIp,
            'userAgent' => $userAgent,
            'language' => $language,
        ]);

        if (!$tokenStorage->save($refreshToken, $tokenData, JWTHelper::REFRESH_TOKEN_TTL)) {
            $res->messages['error'][] = TranslationProvider::translate('auth_TokenSaveFailed');
            return $res;
        }

        // Return access token and cookie instructions
        $cookieExpiry = $rememberMe ? time() + JWTHelper::REFRESH_TOKEN_TTL : 0; // 0 = session cookie

        $res->data = DataStructure::createLoginResponse(
            $accessToken,
            JWTHelper::ACCESS_TOKEN_TTL,
            $userId
        );

        // Add cookie instructions for controller (will be removed before sending to client)
        $res->data['_cookieData'] = [
            'set_refreshToken' => [
                'value' => $refreshToken,
                'expiry' => $cookieExpiry
            ]
        ];

        $res->success = true;

        // Log successful authentication for audit trail
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Successful login: User={$userId} From={$clientIp} UserAgent={$userAgent}",
            LOG_INFO
        );

        // Send login notification email if enabled
        self::sendLoginNotification($userId, $clientIp, $userAgent);

        return $res;
    }

    /**
     * Authenticate using sessionToken from passkey authentication
     *
     * @param string $sessionToken One-time session token
     * @param \Phalcon\Cache\Adapter\AdapterInterface $cache Cache service
     * @return array<string, mixed>|null Session parameters or null if invalid
     */
    private static function authenticateWithSessionToken(string $sessionToken, $cache): ?array
    {
        $tokenKey = "passkey:session-token:{$sessionToken}";

        // Retrieve session params from cache
        $sessionData = $cache->get($tokenKey);

        if (!$sessionData) {
            return null; // Token expired or invalid
        }

        // Delete token immediately (one-time use)
        $cache->delete($tokenKey);

        $sessionParams = json_decode($sessionData, true);

        return is_array($sessionParams) ? $sessionParams : null;
    }


    /**
     * Check and update rate limiting
     *
     * @param string $clientIp Client IP address
     * @param bool $increment Whether to increment counter
     * @param \Phalcon\Cache\Adapter\AdapterInterface $cache Cache service
     * @return int Remaining attempts
     */
    private static function checkRateLimit(string $clientIp, bool $increment, $cache): int
    {
        $timestamp = time();
        $intervalStart = floor($timestamp / self::ATTEMPTS_INTERVAL) * self::ATTEMPTS_INTERVAL;
        $key = "auth:login-attempts:{$intervalStart}:{$clientIp}";

        $adapter = $cache->getAdapter();

        if ($increment) {
            $adapter->zIncrBy($key, 1, $clientIp);
        } else {
            $adapter->zIncrBy($key, 0, $clientIp);
        }

        $adapter->expire($key, self::ATTEMPTS_INTERVAL);

        $count = (int)$adapter->zScore($key, $clientIp);

        return max(self::MAX_ATTEMPTS - $count, 0);
    }

    /**
     * Queue login notification for background processing
     *
     * Adds notification job to Beanstalk queue with deduplication.
     * This ensures login process is not blocked by email sending.
     *
     * @param string $userId Username that logged in
     * @param string $clientIp Client IP address
     * @param string $userAgent Browser user agent
     * @return void
     */
    private static function sendLoginNotification(string $userId, string $clientIp, string $userAgent): void
    {
        try {
            // Check if login notifications are enabled
            if (PbxSettings::getValueByKey(PbxSettings::SEND_LOGIN_NOTIFICATIONS) !== '1') {
                SystemMessages::sysLogMsg(__METHOD__, 'Login notifications disabled in settings', LOG_DEBUG);
                return;
            }

            // Get system email for notifications
            $systemEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);
            if (empty($systemEmail)) {
                SystemMessages::sysLogMsg(__METHOD__, 'No system email configured for login notifications', LOG_WARNING);
                return;
            }

            // Queue notification job for WorkerNotifyByEmail
            // Use special type 'login' to distinguish from missed calls
            $notificationData = [
                [
                    'type' => 'login',  // Special type for login notifications
                    'email' => $systemEmail,
                    'username' => $userId,
                    'ip_address' => $clientIp,
                    'user_agent' => $userAgent,
                    'login_time' => date('Y-m-d H:i:s T'),
                    'timestamp' => time(),
                ]
            ];

            // Send to Beanstalk queue (WorkerNotifyByEmail will handle deduplication)
            $client = new BeanstalkClient(WorkerNotifyByEmail::class);
            if ($client->isConnected()) {
                $client->publish(json_encode($notificationData));
                SystemMessages::sysLogMsg(__METHOD__, "Login notification queued for: {$systemEmail}", LOG_INFO);
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to connect to Beanstalk for login notification", LOG_WARNING);
            }

        } catch (\Throwable $e) {
            // Don't fail login if notification queueing fails
            SystemMessages::sysLogMsg(__METHOD__, "Exception queueing login notification: " . $e->getMessage(), LOG_WARNING);
        }
    }
}

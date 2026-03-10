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

use MikoPBX\Common\Library\Auth\RedisTokenStorage;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use Phalcon\Di\Di;
use Phalcon\Encryption\Security\Random;

/**
 * Refresh Action - Refresh JWT access token
 *
 * Reads refresh token from httpOnly cookie, validates it,
 * and returns new access token.
 *
 * Optionally rotates refresh token for enhanced security:
 * - Generates new refresh token
 * - Invalidates old refresh token
 * - Updates cookie with new token
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 */
class RefreshAction
{
    /**
     * Enable refresh token rotation for enhanced security
     */
    private const bool ENABLE_TOKEN_ROTATION = true;

    /**
     * Maximum refresh attempts per interval
     */
    private const int MAX_REFRESH_ATTEMPTS = 20;

    /**
     * Interval to reset refresh attempts (seconds)
     */
    private const int REFRESH_ATTEMPTS_INTERVAL = 300;

    /**
     * Process refresh request
     *
     * Expects $data to contain:
     * - refreshToken (string, from cookie via controller)
     * - clientIp (string, from controller)
     * - userAgent (string, from controller)
     *
     * Returns PBXApiResult with:
     * - data['accessToken'] - new JWT access token
     * - data['tokenType'] - "Bearer"
     * - data['expiresIn'] - seconds until expiration
     * - data['_cookieData'] - internal cookie instructions (if rotation enabled)
     *
     * @param array<string, mixed> $data Request data with client info
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Extract and validate data (passed by controller)
        $refreshToken = $data['refreshToken'] ?? null;
        $clientIp = isset($data['clientIp']) && is_string($data['clientIp']) ? $data['clientIp'] : '';
        $userAgent = isset($data['userAgent']) && is_string($data['userAgent']) ? $data['userAgent'] : '';

        // Get services via DI (worker context)
        $di = Di::getDefault();
        if ($di === null) {
            $res->messages['error'][] = 'Dependency injection container not available';
            $res->httpCode = 500;
            return $res;
        }

        // Rate limit refresh attempts
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $remaining = self::checkRefreshRateLimit($clientIp, $cache);
        if ($remaining <= 0) {
            $res->messages['error'][] = TranslationProvider::translate(
                'auth_TooManyLoginAttempts',
                ['interval' => self::REFRESH_ATTEMPTS_INTERVAL]
            );
            $res->httpCode = 429;
            return $res;
        }

        // Check refresh token from cookie - validate type for PHPStan
        if (!is_string($refreshToken) || empty($refreshToken)) {
            $res->messages['error'][] = TranslationProvider::translate('auth_RefreshTokenMissing');
            $res->httpCode = 401; // Unauthorized - missing credentials
            return $res;
        }

        // Initialize Redis token storage (O(1) lookup instead of O(n) SQLite scan)
        $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
        $tokenStorage = new RedisTokenStorage($redis);

        // Get token data from Redis (fast hash-based lookup)
        $sessionParams = $tokenStorage->get($refreshToken);

        if ($sessionParams === null) {
            $res->messages['error'][] = TranslationProvider::translate('auth_RefreshTokenExpired');
            $res->httpCode = 401; // Unauthorized - invalid/expired token
            return $res;
        }

        // Validate session params structure
        if (empty($sessionParams) || !is_array($sessionParams)) {
            $res->messages['error'][] = TranslationProvider::translate('auth_InvalidSessionData');
            $res->httpCode = 401; // Unauthorized - corrupted session
            return $res;
        }

        $userId = $sessionParams[SessionController::USER_NAME] ?? '';

        // Determine language for JWT payload
        // Priority: 1) stored in refresh token, 2) system settings (backward compatibility)
        $language = isset($sessionParams['language']) && is_string($sessionParams['language'])
            ? $sessionParams['language']
            : \MikoPBX\Common\Models\PbxSettings::getValueByKey(\MikoPBX\Common\Models\PbxSettings::WEB_ADMIN_LANGUAGE);

        // Update session params with language (ensures it's preserved during rotation)
        $sessionParams['language'] = $language;

        // Generate new JWT access token
        $accessToken = JWTHelper::generate([
            'userId' => $userId,
            'role' => $sessionParams[SessionController::ROLE] ?? 'user',
            'language' => $language,
        ], JWTHelper::ACCESS_TOKEN_TTL);

        // Token rotation (optional, for enhanced security)
        // @phpstan-ignore-next-line (constant used as feature flag)
        if (self::ENABLE_TOKEN_ROTATION) {
            // Generate new refresh token
            $random = new Random();
            try {
                $newRefreshToken = $random->hex(32);
            } catch (\Throwable $e) {
                $newRefreshToken = bin2hex(random_bytes(32));
            }

            // Update client information in session params
            $sessionParams['clientIp'] = $clientIp;
            $sessionParams['userAgent'] = $userAgent;

            // Rotate token in Redis (deletes old, creates new)
            if (!$tokenStorage->rotate($refreshToken, $newRefreshToken, $sessionParams, JWTHelper::REFRESH_TOKEN_TTL)) {
                $res->messages['error'][] = TranslationProvider::translate('auth_TokenUpdateFailed');
                $res->httpCode = 500; // Internal server error - storage failure
                return $res;
            }

            // Get homePage from sessionParams (stored during login)
            $homePage = $sessionParams[SessionController::HOME_PAGE] ?? '/admin-cabinet/extensions/index';

            // Return new access token with cookie instructions
            $res->data = DataStructure::createRefreshResponse(
                $accessToken,
                JWTHelper::ACCESS_TOKEN_TTL,
                $homePage
            );

            // Add cookie instructions for controller (will be removed before sending to client)
            $res->data['_cookieData'] = [
                'set_refreshToken' => [
                    'value' => $newRefreshToken,
                    'expiry' => time() + JWTHelper::REFRESH_TOKEN_TTL
                ]
            ];
        } else {
            // No rotation - just update lastUsedAt
            $tokenStorage->touch($refreshToken);

            // Get homePage from sessionParams (stored during login)
            $homePage = $sessionParams[SessionController::HOME_PAGE] ?? '/admin-cabinet/extensions/index';

            // Return new access token (no cookie update)
            $res->data = DataStructure::createRefreshResponse(
                $accessToken,
                JWTHelper::ACCESS_TOKEN_TTL,
                $homePage
            );
        }

        $res->success = true;

        return $res;
    }

    /**
     * Check rate limiting for refresh attempts
     *
     * @param string $clientIp Client IP address
     * @param \Phalcon\Cache\Adapter\AdapterInterface $cache Cache service
     * @return int Remaining attempts
     */
    private static function checkRefreshRateLimit(string $clientIp, $cache): int
    {
        $intervalStart = floor(time() / self::REFRESH_ATTEMPTS_INTERVAL)
            * self::REFRESH_ATTEMPTS_INTERVAL;
        $key = "auth:refresh-attempts:{$intervalStart}:{$clientIp}";

        $adapter = $cache->getAdapter();
        $adapter->zIncrBy($key, 1, $clientIp);
        $adapter->expire($key, self::REFRESH_ATTEMPTS_INTERVAL);

        $count = (int)$adapter->zScore($key, $clientIp);

        return max(self::MAX_REFRESH_ATTEMPTS - $count, 0);
    }
}

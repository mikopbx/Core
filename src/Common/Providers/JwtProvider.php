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

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Library\Auth\RedisTokenStorage;
use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * JWT Service Provider for token validation and payload extraction.
 *
 * Provides a shared service for validating JWT tokens and extracting claims
 * without coupling AdminCabinet to PBXCoreREST.
 *
 * @package MikoPBX\Common\Providers
 */
class JwtProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'jwt';

    /**
     * Leeway time for clock skew and system time changes (seconds)
     * Must match JWTHelper::LEEWAY for consistent validation
     */
    public const int LEEWAY = 600; // 10 minutes

    /**
     * Register JWT service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                return new class {
                    /**
                     * Validate and decode JWT token
                     *
                     * @param string $token JWT token
                     * @return array<string, mixed>|null Payload if valid, null if invalid
                     */
                    public function validate(string $token): ?array
                    {
                        $parts = explode('.', $token);

                        if (count($parts) !== 3) {
                            return null;
                        }

                        [$base64UrlHeader, $base64UrlPayload, $base64UrlSignature] = $parts;

                        // Verify signature
                        $signature = hash_hmac(
                            'sha256',
                            $base64UrlHeader . '.' . $base64UrlPayload,
                            $this->getSecret(),
                            true
                        );

                        $expectedSignature = $this->base64UrlEncode($signature);

                        if (!hash_equals($expectedSignature, $base64UrlSignature)) {
                            return null; // Invalid signature
                        }

                        // Decode payload
                        $payload = json_decode($this->base64UrlDecode($base64UrlPayload), true);

                        if (!is_array($payload)) {
                            return null;
                        }

                        $now = time();

                        // Check expiration with leeway
                        if (isset($payload['exp']) && is_int($payload['exp']) && ($payload['exp'] + JwtProvider::LEEWAY) < $now) {
                            return null; // Token expired
                        }

                        // Check not before with leeway
                        if (isset($payload['nbf']) && is_int($payload['nbf']) && ($payload['nbf'] - JwtProvider::LEEWAY) > $now) {
                            return null; // Token not yet valid
                        }

                        return $payload;
                    }

                    /**
                     * Extract role from JWT Bearer token in Authorization header.
                     *
                     * @param string|null $authHeader Authorization header value
                     * @return string|null Role from JWT claims, or null if not available
                     */
                    public function extractRoleFromHeader(?string $authHeader): ?string
                    {
                        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
                            return null;
                        }

                        $token = substr($authHeader, 7); // Remove "Bearer " prefix
                        $payload = $this->validate($token);

                        if ($payload === null || !isset($payload['role'])) {
                            return null;
                        }

                        return $payload['role'];
                    }

                    /**
                     * Extract role from refresh token stored in Redis.
                     *
                     * Used for browser page loads when no Bearer header is present,
                     * but refreshToken cookie exists.
                     *
                     * @param string $refreshToken Plain refresh token from cookie
                     * @return string|null Role from Redis session data, or null if not found
                     */
                    public function extractRoleFromRefreshToken(string $refreshToken): ?string
                    {
                        $di = Di::getDefault();
                        if ($di === null) {
                            return null;
                        }

                        try {
                            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
                            $storage = new RedisTokenStorage($redis);

                            $data = $storage->get($refreshToken);
                            if ($data === null || !isset($data['role'])) {
                                return null;
                            }

                            return $data['role'];
                        } catch (\Throwable) {
                            return null;
                        }
                    }

                    /**
                     * Extract user ID (userName) from refresh token stored in Redis.
                     *
                     * Used for identifying logged-in user in module controllers
                     * when PHP session is not available (JWT authentication).
                     *
                     * @param string $refreshToken Plain refresh token from cookie
                     * @return string|null User ID (login) from Redis session data, or null if not found
                     */
                    public function extractUserIdFromRefreshToken(string $refreshToken): ?string
                    {
                        $di = Di::getDefault();
                        if ($di === null) {
                            return null;
                        }

                        try {
                            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
                            $storage = new RedisTokenStorage($redis);

                            $data = $storage->get($refreshToken);
                            if ($data === null || !isset($data['userName'])) {
                                return null;
                            }

                            return $data['userName'];
                        } catch (\Throwable) {
                            return null;
                        }
                    }

                    /**
                     * Extract home page URL from refresh token stored in Redis.
                     *
                     * Used for logo click redirect - users with limited permissions
                     * should be redirected to their configured home page, not /admin-cabinet/index.
                     *
                     * @param string $refreshToken Plain refresh token from cookie
                     * @return string|null Home page URL from Redis session data, or null if not found
                     */
                    public function extractHomePageFromRefreshToken(string $refreshToken): ?string
                    {
                        $di = Di::getDefault();
                        if ($di === null) {
                            return null;
                        }

                        try {
                            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
                            $storage = new RedisTokenStorage($redis);

                            $data = $storage->get($refreshToken);
                            if ($data === null || !isset($data['homePage'])) {
                                return null;
                            }

                            return $data['homePage'];
                        } catch (\Throwable) {
                            return null;
                        }
                    }

                    /**
                     * Get JWT secret key from system settings
                     *
                     * Uses a dedicated random secret stored in PbxSettings.
                     * Auto-generates on first use to ensure high entropy regardless of boot order.
                     *
                     * @return string Secret key
                     */
                    private function getSecret(): string
                    {
                        $secret = PbxSettings::getValueByKey(PbxSettings::JWT_SECRET);

                        if (empty($secret)) {
                            $secret = bin2hex(random_bytes(32));
                            PbxSettings::setValueByKey(PbxSettings::JWT_SECRET, $secret);
                        }

                        return $secret;
                    }

                    /**
                     * Base64 URL encode
                     *
                     * @param string $data Data to encode
                     * @return string Base64 URL encoded string
                     */
                    private function base64UrlEncode(string $data): string
                    {
                        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
                    }

                    /**
                     * Base64 URL decode
                     *
                     * @param string $data Data to decode
                     * @return string Decoded string
                     */
                    private function base64UrlDecode(string $data): string
                    {
                        $remainder = strlen($data) % 4;
                        if ($remainder) {
                            $data .= str_repeat('=', 4 - $remainder);
                        }
                        return base64_decode(strtr($data, '-_', '+/'));
                    }
                };
            }
        );
    }
}

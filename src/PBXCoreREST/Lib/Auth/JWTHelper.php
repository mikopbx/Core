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

use MikoPBX\Common\Models\PbxSettings;

/**
 * JWT Helper for token generation and validation
 *
 * Implements HS256 (HMAC with SHA-256) algorithm without external dependencies.
 * Provides secure JWT token generation and validation for API authentication.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519 - JSON Web Token (JWT)
 */
class JWTHelper
{
    /**
     * Access token expiration time (seconds)
     */
    public const ACCESS_TOKEN_TTL = 900; // 15 minutes

    /**
     * Refresh token expiration time (seconds)
     */
    public const REFRESH_TOKEN_TTL = 2592000; // 30 days

    /**
     * Leeway time for clock skew and system time changes (seconds)
     * Allows tokens to remain valid even if system time changes by up to this amount
     * Standard practice is 5-10 minutes to handle NTP sync and manual time adjustments
     */
    public const LEEWAY = 600; // 10 minutes

    /**
     * Generate JWT token
     *
     * @param array<string, mixed> $payload Payload data (userId, login, etc.)
     * @param int $expiresIn Expiration time in seconds (default: ACCESS_TOKEN_TTL)
     * @return string JWT token
     */
    public static function generate(array $payload, int $expiresIn = self::ACCESS_TOKEN_TTL): string
    {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $now = time();
        $payload['iat'] = $now;           // Issued At
        $payload['exp'] = $now + $expiresIn; // Expiration Time
        $payload['nbf'] = $now;           // Not Before

        $encodedHeader = json_encode($header);
        $encodedPayload = json_encode($payload);

        if ($encodedHeader === false || $encodedPayload === false) {
            throw new \RuntimeException('Failed to encode JWT header or payload');
        }

        $base64UrlHeader = self::base64UrlEncode($encodedHeader);
        $base64UrlPayload = self::base64UrlEncode($encodedPayload);

        $signature = hash_hmac(
            'sha256',
            $base64UrlHeader . '.' . $base64UrlPayload,
            self::getSecret(),
            true
        );

        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . '.' . $base64UrlPayload . '.' . $base64UrlSignature;
    }

    /**
     * Validate and decode JWT token
     *
     * @param string $token JWT token
     * @return array<string, mixed>|null Payload if valid, null if invalid
     */
    public static function validate(string $token): ?array
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
            self::getSecret(),
            true
        );

        $expectedSignature = self::base64UrlEncode($signature);

        if (!hash_equals($expectedSignature, $base64UrlSignature)) {
            return null; // Invalid signature
        }

        // Decode payload
        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);

        if (!is_array($payload)) {
            return null;
        }

        $now = time();

        // Check expiration with leeway (allows for clock skew and system time changes)
        // Token is considered expired only if current time > exp + leeway
        if (isset($payload['exp']) && is_int($payload['exp']) && ($payload['exp'] + self::LEEWAY) < $now) {
            return null; // Token expired
        }

        // Check not before with leeway (allows for clock skew and system time changes)
        // Token is considered valid if current time + leeway >= nbf
        if (isset($payload['nbf']) && is_int($payload['nbf']) && ($payload['nbf'] - self::LEEWAY) > $now) {
            return null; // Token not yet valid
        }

        return $payload;
    }

    /**
     * Get JWT secret key from system settings
     *
     * @return string Secret key
     */
    private static function getSecret(): string
    {
        // Use SSH RSA key as secret (unique per installation)
        $secret = PbxSettings::getValueByKey(PbxSettings::SSH_RSA_KEY);

        if (empty($secret)) {
            // Fallback to web admin password hash
            $secret = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
        }

        return $secret;
    }

    /**
     * Base64 URL encode
     *
     * @param string $data Data to encode
     * @return string Base64 URL encoded string
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     *
     * @param string $data Data to decode
     * @return string Decoded string
     */
    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Extract payload from token without validation
     * Useful for debugging or getting user info before full validation
     *
     * @param string $token JWT token
     * @return array<string, mixed>|null Payload if decodable, null otherwise
     */
    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($parts[1]), true);

        return is_array($payload) ? $payload : null;
    }

    
}

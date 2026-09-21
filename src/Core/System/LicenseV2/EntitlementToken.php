<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\LicenseV2;

use RuntimeException;

/**
 * Entitlement token signed by the licensing server (Ed25519).
 *
 * Wire format: base64url(payloadJson) . '.' . base64url(signature).
 * The signature covers the base64url payload string, so no JSON canonicalization is needed.
 *
 * Payload: v, install, key, nonce, iat, exp,
 *          features {featureId: expireTimestamp}, modules {moduleUniqueID: featureId}.
 */
class EntitlementToken
{
    public const int VERSION = 2;

    /** Tolerated difference between the server clock and the PBX clock, seconds. */
    public const int CLOCK_SKEW = 300;

    /**
     * Checks the signature and the installation binding. Does not check the lifetime,
     * so the module-to-feature map of an expired token stays trustworthy.
     *
     * @return array<string, mixed> Decoded payload.
     * @throws RuntimeException When the token is malformed, forged or issued for another installation.
     */
    public static function decodeVerified(string $token, string $serverPublicKeyPem, string $installId): array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 2) {
            throw new RuntimeException('Malformed entitlement token');
        }
        [$payloadPart, $signaturePart] = $parts;
        $signature = self::base64UrlDecode($signaturePart);
        if (openssl_verify($payloadPart, $signature, $serverPublicKeyPem, 0) !== 1) {
            throw new RuntimeException('Entitlement token signature is invalid');
        }
        $payload = json_decode(self::base64UrlDecode($payloadPart), true);
        if (!is_array($payload) || ($payload['v'] ?? null) !== self::VERSION) {
            throw new RuntimeException('Unsupported entitlement token version');
        }
        if (!is_array($payload['modules'] ?? null) || $payload['modules'] === []) {
            // An empty map must never mean "nothing to check".
            throw new RuntimeException('Entitlement token has no module map');
        }
        if (!hash_equals($installId, (string)($payload['install'] ?? ''))) {
            throw new RuntimeException('Entitlement token belongs to another installation');
        }
        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function isFresh(array $payload, int $now): bool
    {
        return (int)($payload['iat'] ?? PHP_INT_MAX) <= $now + self::CLOCK_SKEW
            && (int)($payload['exp'] ?? 0) > $now;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function featureValid(array $payload, string $featureId, int $now): bool
    {
        return (int)($payload['features'][$featureId] ?? 0) > $now;
    }

    public static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode(string $data): string
    {
        return (string)base64_decode(strtr($data, '-_', '+/'), true);
    }
}

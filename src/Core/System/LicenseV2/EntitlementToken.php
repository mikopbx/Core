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

/**
 * Entitlement token signed by the licensing server (Ed25519).
 *
 * Wire format: base64url(payloadJson) . '.' . base64url(signature).
 * The signature covers the base64url payload string, so no JSON canonicalization is needed.
 *
 * Payload: v, install, key, nonce, iat, exp, offlineUntil,
 *          features {featureId: expireTimestamp}, modules {moduleUniqueID: featureId},
 *          seats {featureId: limit >= 0} (optional), poll (optional, 300..900 s),
 *          drop [ref, ...] (optional).
 *
 * exp is when the PBX must have a newer token; offlineUntil is how long the server lets the last
 * token live while the licensing servers can not be reached (the grace period). Grace extends the
 * token only, never a feature: the issuer must set features[*] >= offlineUntil for it to matter.
 *
 * A refusal uses the same wire format with payload: v, install, nonce, refused = true, error.
 * It is signed as well, so only the licensing server can take the license away.
 */
class EntitlementToken
{
    public const int VERSION = 2;

    /** Tolerated difference between the server clock and the PBX clock, seconds. */
    public const int CLOCK_SKEW = 300;

    /** How often the PBX reports to the server when the token does not say, seconds. */
    public const int POLL_DEFAULT = 600;
    public const int POLL_MIN = 300;
    public const int POLL_MAX = 900;

    /**
     * Checks the signature and the installation binding. Does not check the lifetime,
     * so the module-to-feature map of an expired token stays trustworthy.
     *
     * @return array<string, mixed> Decoded payload.
     * @throws TokenRejectedException When the token is malformed, forged or issued for another installation.
     */
    public static function decodeVerified(string $token, string $serverPublicKeyPem, string $installId): array
    {
        $payload = self::decodeSigned($token, $serverPublicKeyPem, $installId);
        if (!is_array($payload['modules'] ?? null) || $payload['modules'] === []) {
            // An empty map must never mean "nothing to check".
            throw new TokenRejectedException('Entitlement token has no module map');
        }
        if (array_key_exists('seats', $payload)) {
            self::assertSeatsMap($payload['seats'], array_keys((array)($payload['features'] ?? [])));
        }
        if (array_key_exists('poll', $payload)) {
            $poll = $payload['poll'];
            if (!is_int($poll) || $poll < self::POLL_MIN || $poll > self::POLL_MAX) {
                throw new TokenRejectedException('Entitlement token has a malformed poll interval');
            }
        }
        if (array_key_exists('drop', $payload)) {
            self::assertDropList($payload['drop']);
        }
        return $payload;
    }

    /**
     * Signature, version and installation binding of any server-signed message.
     *
     * @return array<string, mixed>
     * @throws TokenRejectedException
     */
    public static function decodeSigned(string $token, string $serverPublicKeyPem, string $installId): array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 2) {
            throw new TokenRejectedException('Malformed entitlement token');
        }
        [$payloadPart, $signaturePart] = $parts;
        $signature = self::base64UrlDecode($signaturePart);
        if (openssl_verify($payloadPart, $signature, $serverPublicKeyPem, 0) !== 1) {
            throw new TokenRejectedException('Entitlement token signature is invalid');
        }
        $payload = json_decode(self::base64UrlDecode($payloadPart), true);
        if (!is_array($payload) || ($payload['v'] ?? null) !== self::VERSION) {
            throw new TokenRejectedException('Unsupported entitlement token version');
        }
        if (!hash_equals($installId, (string)($payload['install'] ?? ''))) {
            throw new TokenRejectedException('Entitlement token belongs to another installation');
        }
        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @param bool $withGrace Count the server-granted offline grace period as lifetime.
     */
    public static function isFresh(array $payload, int $now, bool $withGrace = false): bool
    {
        $validUntil = (int)($payload['exp'] ?? 0);
        if ($withGrace) {
            $validUntil = max($validUntil, (int)($payload['offlineUntil'] ?? 0));
        }
        return (int)($payload['iat'] ?? PHP_INT_MAX) <= $now + self::CLOCK_SKEW && $validUntil > $now;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function featureValid(array $payload, string $featureId, int $now): bool
    {
        return (int)($payload['features'][$featureId] ?? 0) > $now;
    }

    /**
     * Seat limit of a feature; null when the feature is licensed per installation (no seats to count).
     *
     * @param array<string, mixed> $payload
     */
    public static function seatLimit(array $payload, string $featureId): ?int
    {
        $limit = $payload['seats'][$featureId] ?? null;
        return is_int($limit) ? $limit : null;
    }

    /**
     * Seconds between two reports to the server; the server sets the pace.
     *
     * @param array<string, mixed> $payload
     */
    public static function poll(array $payload): int
    {
        return (int)($payload['poll'] ?? self::POLL_DEFAULT);
    }

    /**
     * Holders the server asks to free, by ref (see SeatLedger::ref()).
     *
     * @param array<string, mixed> $payload
     * @return array<int, string>
     */
    public static function dropRefs(array $payload): array
    {
        return array_values((array)($payload['drop'] ?? []));
    }

    /**
     * A signature does not make the map well-formed: every value must be an int >= 0 keyed by a licensed feature.
     * 0 is a share of a key whose other PBXs took every seat: no seat, not "uncounted".
     *
     * @param array<int|string> $licensedFeatures
     * @throws TokenRejectedException
     */
    private static function assertSeatsMap(mixed $seats, array $licensedFeatures): void
    {
        if (!is_array($seats)) {
            throw new TokenRejectedException('Entitlement token has a malformed seats map');
        }
        $licensedFeatureIds = array_map('strval', $licensedFeatures);
        foreach ($seats as $featureId => $limit) {
            $isLicensed = in_array((string)$featureId, $licensedFeatureIds, true);
            if (!is_int($limit) || $limit < 0 || !$isLicensed) {
                throw new TokenRejectedException('Entitlement token has a malformed seats map');
            }
        }
    }

    /**
     * @throws TokenRejectedException
     */
    private static function assertDropList(mixed $drop): void
    {
        if (!is_array($drop) || !array_is_list($drop)) {
            throw new TokenRejectedException('Entitlement token has a malformed drop list');
        }
        foreach ($drop as $ref) {
            if (!is_string($ref) || preg_match('/^[0-9a-f]{16}$/', $ref) !== 1) {
                throw new TokenRejectedException('Entitlement token has a malformed drop list');
            }
        }
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

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

namespace MikoPBX\PBXCoreREST\Lib\Passkeys;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di\Di;
use MikoPBX\Common\Providers\TranslationProvider;

/**
 * WebAuthn Registration Start Action
 *
 * Generates WebAuthn challenge and publicKeyCredentialCreationOptions.
 * Stores challenge in Redis for verification during registrationFinish.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class RegistrationStartAction
{
    /**
     * Start WebAuthn registration
     *
     * @param array $sessionContext Session context with user_name and origin
     * @param array $data Additional data (optional name for passkey)
     * @return PBXApiResult
     */
    public static function main(array $sessionContext, array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $login = $sessionContext['user_name'] ?? '';
        $origin = $sessionContext['origin'] ?? '';
        $sessionId = $sessionContext['session_id'] ?? '';

        if (empty($login)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_UserNotAuthenticated');
            return $res;
        }

        if (empty($origin)) {
            $res->messages['error'][] = 'Origin is required for WebAuthn';
            return $res;
        }

        // Generate random challenge for WebAuthn registration
        // Verification is performed in RegistrationFinishAction using lbuchs/webauthn library
        $challenge = base64_encode(random_bytes(32));
        $rpId = parse_url($origin, PHP_URL_HOST);

        // Store challenge in managed cache with 5-minute TTL
        $di = Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $challengeKey = "passkey:challenge:{$sessionId}";
        $cache->set($challengeKey, json_encode([
            'challenge' => $challenge,
            'login' => $login,
            'origin' => $origin,
            'rpName' => 'MikoPBX',
            'rpId' => $rpId,
            'userVerification' => 'preferred',
            'timestamp' => time()
        ]), 300); // 5 minutes TTL

        // Return publicKeyCredentialCreationOptions structure
        $res->data = [
            'sessionId' => $sessionId,
            'challenge' => $challenge,
            'rp' => [
                'name' => 'MikoPBX',
                'id' => $rpId
            ],
            'user' => [
                'id' => base64_encode($login),
                'name' => $login,
                'displayName' => $login
            ],
            'pubKeyCredParams' => [
                ['type' => 'public-key', 'alg' => -7],  // ES256
                ['type' => 'public-key', 'alg' => -257] // RS256
            ],
            'timeout' => 60000,
            'attestation' => 'none',
            'authenticatorSelection' => [
                // Don't specify authenticatorAttachment to allow both platform (Touch ID/Face ID)
                // and cross-platform (YubiKey) authenticators
                'requireResidentKey' => false,
                'userVerification' => 'preferred'
            ]
        ];

        $res->success = true;

        return $res;
    }
}

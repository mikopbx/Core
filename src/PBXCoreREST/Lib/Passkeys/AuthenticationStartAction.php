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

use MikoPBX\Common\Models\UserPasskeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Di;
use Phalcon\Encryption\Security\Random;

/**
 * WebAuthn Authentication Start Action (PUBLIC)
 *
 * Generates challenge for authentication.
 * This endpoint does NOT require authentication - it's for login flow.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class AuthenticationStartAction
{
    /**
     * Start WebAuthn authentication
     *
     * Supports two flows:
     * 1. With login (traditional) - filters passkeys by user
     * 2. Without login (usernameless) - allows browser to show all available passkeys
     *
     * @param array $data Request data with optional 'login' and required 'origin'
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $login = $data['login'] ?? '';
        $origin = $data['origin'] ?? '';

        if (empty($origin)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_OriginRequired');
            return $res;
        }

        // Generate random challenge
        $random = new Random();
        try {
            $challenge = $random->base64(32);
        } catch (\Throwable $e) {
            // Fallback to random_bytes if Random fails
            $challenge = base64_encode(random_bytes(32));
        }
        $sessionId = uniqid('auth_', true);

        // Determine authentication flow
        $isUsernameless = empty($login);
        $allowCredentials = [];

        if ($isUsernameless) {
            // Usernameless authentication - allow browser to show all available passkeys
            // Browser will return userHandle with the selected credential
            $allowCredentials = []; // Empty = show all passkeys for this RP ID
        } else {
            // Traditional authentication with known login
            // Find all passkeys for this specific user
            $passkeys = UserPasskeys::find([
                'conditions' => 'login = :login:',
                'bind' => ['login' => $login]
            ]);

            if (count($passkeys) === 0) {
                $res->messages['error'][] = TranslationProvider::translate('pk_NoPasskeysFound');
                return $res;
            }

            // Build allowCredentials list for this user
            foreach ($passkeys as $passkey) {
                $allowCredentials[] = PasskeyDataStructure::getForAuthentication($passkey);
            }
        }

        // Store challenge in managed cache with 5-minute TTL
        $di = Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $challengeKey = "passkey:auth-challenge:{$sessionId}";
        $cache->set($challengeKey, json_encode([
            'challenge' => $challenge,
            'login' => $login,
            'origin' => $origin,
            'rpName' => 'MikoPBX',
            'rpId' => parse_url($origin, PHP_URL_HOST),
            'userVerification' => 'preferred',
            'usernameless' => $isUsernameless,
            'timestamp' => time()
        ]), 300); // 5 minutes TTL

        // Return publicKeyCredentialRequestOptions structure
        $res->data = [
            'sessionId' => $sessionId, // Client will send this back in authenticationFinish
            'challenge' => $challenge,
            'rpId' => parse_url($origin, PHP_URL_HOST),
            'allowCredentials' => $allowCredentials,
            'timeout' => 60000,
            'userVerification' => 'preferred'
        ];

        $res->success = true;

        return $res;
    }
}

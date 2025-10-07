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

use MikoPBX\Common\Library\Auth\CredentialsValidator;
use MikoPBX\Common\Models\UserPasskeys;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use Phalcon\Di\Di;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Encryption\Security\Random;
use lbuchs\WebAuthn\WebAuthn;
use lbuchs\WebAuthn\Binary\ByteBuffer;

/**
 * WebAuthn Authentication Finish Action (PUBLIC)
 *
 * Verifies authentication assertion and returns session data.
 * This endpoint does NOT require authentication - it's for login flow.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class AuthenticationFinishAction
{
    /**
     * Convert base64url to standard base64
     */
    private static function base64urlToBase64(string $base64url): string
    {
        $padding = strlen($base64url) % 4;
        if ($padding > 0) {
            $base64url .= str_repeat('=', 4 - $padding);
        }
        return strtr($base64url, '-_', '+/');
    }

    /**
     * Finish WebAuthn authentication
     *
     * @param array $data Assertion response from browser with challengeId
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $sessionId = $data['sessionId'] ?? '';
        $credentialId = $data['credentialId'] ?? '';

        if (empty($sessionId)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_SessionIdRequired');
            return $res;
        }

        if (empty($credentialId)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_CredentialIdRequired');
            return $res;
        }

        // Retrieve challenge from managed cache
        $di = Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $challengeKey = "passkey:auth-challenge:{$sessionId}";
        $challengeData = $cache->get($challengeKey);

        if (!$challengeData) {
            $res->messages['error'][] = TranslationProvider::translate('pk_ChallengeNotFound');
            return $res;
        }

        $challengeInfo = json_decode($challengeData, true);
        $isUsernameless = $challengeInfo['usernameless'] ?? false;

        // Find passkey by credential_id
        $passkey = UserPasskeys::findFirst([
            'conditions' => 'credential_id = :cred_id:',
            'bind' => ['cred_id' => $credentialId]
        ]);

        if (!$passkey) {
            $res->messages['error'][] = TranslationProvider::translate('pk_PasskeyNotFound');
            return $res;
        }

        // Determine and verify login based on authentication flow
        if ($isUsernameless) {
            // Usernameless authentication - extract login from userHandle
            if (empty($data['userHandle'])) {
                $res->messages['error'][] = TranslationProvider::translate('pk_UserHandleRequired');
                return $res;
            }

            // Decode userHandle to get login (it was base64-encoded during registration)
            $loginFromUserHandle = base64_decode(self::base64urlToBase64($data['userHandle']));

            // Verify the passkey belongs to the user identified by userHandle
            if ($passkey->login !== $loginFromUserHandle) {
                $res->messages['error'][] = TranslationProvider::translate('pk_LoginMismatch');
                return $res;
            }

            $login = $loginFromUserHandle;
        } else {
            // Traditional authentication with known login from challenge
            $login = $challengeInfo['login'];

            // Verify login matches
            if ($passkey->login !== $login) {
                $res->messages['error'][] = TranslationProvider::translate('pk_LoginMismatch');
                return $res;
            }
        }

        try {
            // Create WebAuthn instance
            // Constructor params: $rpName, $rpId, $allowedFormats=null, $useBase64UrlEncoding=false
            $webAuthn = new WebAuthn(
                $challengeInfo['rpName'],
                $challengeInfo['rpId']
            );

            // Prepare client data for verification
            $clientDataJSON = base64_decode(self::base64urlToBase64($data['clientDataJSON']));
            $authenticatorData = base64_decode(self::base64urlToBase64($data['authenticatorData']));
            $signature = base64_decode(self::base64urlToBase64($data['signature']));
            $userHandle = !empty($data['userHandle']) ? base64_decode(self::base64urlToBase64($data['userHandle'])) : null;

            // Convert base64 challenge to ByteBuffer
            $challenge = new ByteBuffer(base64_decode($challengeInfo['challenge']));

            // Verify assertion
            $webAuthn->processGet(
                $clientDataJSON,
                $authenticatorData,
                $signature,
                $passkey->public_key,
                $challenge,
                $passkey->counter,
                $challengeInfo['userVerification'] === 'required'
            );

            // Get sign count from authenticator data
            $signCount = unpack('N', substr($authenticatorData, 33, 4))[1];

            // Update counter and last used timestamp
            $passkey->counter = $signCount;
            $passkey->last_used_at = date('Y-m-d H:i:s');
            $passkey->save();

            // Delete challenge from managed cache
            $cache->delete($challengeKey);

            // Build session data - check both admin and modules
            $sessionParams = self::buildSessionParams($login);

            if ($sessionParams) {
                // Generate one-time token for session creation
                $random = new Random();
                try {
                    // Generate 64 hex characters (256 bits of entropy)
                    $sessionToken = $random->hex(32);
                } catch (\Throwable $e) {
                    // Fallback to random_bytes if Random fails
                    $sessionToken = bin2hex(random_bytes(32));
                }

                $tokenKey = "passkey:session-token:{$sessionToken}";

                // Store session params in managed cache with 60 second TTL
                $cache->set($tokenKey, json_encode($sessionParams), 60);

                $res->data = [
                    'sessionToken' => $sessionToken,
                    'login' => $login
                ];
                $res->success = true;
            } else {
                $res->messages['error'][] = TranslationProvider::translate('pk_SessionBuildFailed');
            }
        } catch (\Throwable $e) {
            $res->messages['error'][] = TranslationProvider::translate('pk_LoginError') . ': ' . $e->getMessage();
        }

        return $res;
    }

    /**
     * Build session parameters for authenticated user
     * Checks admin credentials and module hooks
     *
     * @param string $login User login
     * @return array<string, mixed>|null Session parameters or null if not found
     */
    private static function buildSessionParams(string $login): ?array
    {
        // Check if this is admin login
        $adminLogin = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LOGIN);

        if ($login === $adminLogin) {
            // Use shared method to build admin session params
            return CredentialsValidator::buildAdminSessionParams($login);
        }

        // Check module hooks for external authentication
        $moduleResults = PBXConfModulesProvider::hookModulesMethod(
            WebUIConfigInterface::GET_PASSKEY_SESSION_DATA,
            [$login]
        );

        foreach ($moduleResults as $sessionParams) {
            if (is_array($sessionParams) && !empty($sessionParams)) {
                return $sessionParams;
            }
        }

        return null;
    }
}

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
use Phalcon\Di\Di;
use MikoPBX\Common\Providers\TranslationProvider;
use lbuchs\WebAuthn\WebAuthn;
use lbuchs\WebAuthn\Binary\ByteBuffer;

/**
 * WebAuthn Registration Finish Action
 *
 * Verifies attestation response and stores credential in database.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class RegistrationFinishAction
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
     * Convert standard base64 to base64url
     */
    private static function base64ToBase64url(string $base64): string
    {
        return rtrim(strtr($base64, '+/', '-_'), '=');
    }

    /**
     * Finish WebAuthn registration
     *
     * @param array $data Attestation response from browser
     * @param array $sessionContext Session context
     * @return PBXApiResult
     */
    public static function main(array $data, array $sessionContext): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $sessionId = $sessionContext['session_id'] ?? '';
        $login = $sessionContext['user_name'] ?? '';

        if (empty($sessionId)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_SessionIdRequired');
            return $res;
        }

        // Retrieve challenge from managed cache
        $di = Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $challengeKey = "passkey:challenge:{$sessionId}";
        $challengeData = $cache->get($challengeKey);

        if (!$challengeData) {
            $res->messages['error'][] = TranslationProvider::translate('pk_ChallengeNotFound');
            return $res;
        }

        $challengeInfo = json_decode($challengeData, true);

        // Verify login matches
        if ($challengeInfo['login'] !== $login) {
            $res->messages['error'][] = TranslationProvider::translate('pk_LoginMismatch');
            return $res;
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
            $attestationObject = base64_decode(self::base64urlToBase64($data['attestationObject']));

            // Convert base64 challenge to ByteBuffer
            $challenge = new ByteBuffer(base64_decode($challengeInfo['challenge']));

            // Verify attestation
            $attestationResult = $webAuthn->processCreate(
                $clientDataJSON,
                $attestationObject,
                $challenge,
                $challengeInfo['userVerification'] === 'required',
                true, // Require user verification
                false // Don't fail on unrecognized attestation format
            );

            // Extract credential data
            $credentialId = self::base64ToBase64url(base64_encode($attestationResult->credentialId));
            $publicKeyPem = $attestationResult->credentialPublicKey;
            $aaguid = bin2hex($attestationResult->AAGUID);
            $signatureCounter = $attestationResult->signatureCounter ?? 0;

            // Get passkey name
            $passkeyName = $data['name'] ?? 'Passkey ' . date('Y-m-d H:i:s');

            // Create new passkey record
            $passkey = new UserPasskeys();
            $passkey->login = $login;
            $passkey->credential_id = $credentialId;
            $passkey->public_key = $publicKeyPem;
            $passkey->counter = $signatureCounter;
            $passkey->name = $passkeyName;
            $passkey->aaguid = $aaguid;
            $passkey->created_at = date('Y-m-d H:i:s');

            if ($passkey->save()) {
                // Delete challenge from managed cache
                $cache->delete($challengeKey);

                $res->data = PasskeyDataStructure::getRecord($passkey);
                $res->success = true;
            } else {
                $res->messages['error'] = $passkey->getMessages();
            }
        } catch (\Throwable $e) {
            $res->messages['error'][] = TranslationProvider::translate('pk_RegisterError') . ': ' . $e->getMessage();
        }

        return $res;
    }
}

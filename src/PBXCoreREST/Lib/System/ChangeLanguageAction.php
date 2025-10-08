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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * ChangeLanguageAction - updates system language and returns new JWT
 *
 * This action:
 * 1. Updates WEB_ADMIN_LANGUAGE system setting
 * 2. Generates new JWT token with updated language (if user is JWT-authenticated)
 * 3. Returns success status with optional new token
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class ChangeLanguageAction
{
    /**
     * Change system language
     *
     * @param array<string, mixed> $data Request data with language field
     * @return PBXApiResult Result with success status and optional new JWT token
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Extract language from request
        $newLanguage = $data['language'] ?? $data['WEB_ADMIN_LANGUAGE'] ?? null;

        if (empty($newLanguage)) {
            $res->messages['error'][] = 'Language parameter is required';
            return $res;
        }

        // Validate language using LanguageProvider (single source of truth)
        if (!array_key_exists($newLanguage, LanguageProvider::AVAILABLE_LANGUAGES)) {
            $res->messages['error'][] = "Invalid language code: {$newLanguage}";
            return $res;
        }

        // Update system language setting
        try {
            PbxSettings::setValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE, $newLanguage);
            $res->success = true;
            $res->messages['success'][] = "Language changed to {$newLanguage}";

            // Get available languages for representation
            $availableLanguages = LanguageProvider::AVAILABLE_LANGUAGES;

            // Return language code and representation (like networkfilterid pattern)
            $res->data['WEB_ADMIN_LANGUAGE'] = $newLanguage;
            $res->data['WEB_ADMIN_LANGUAGE_represent'] = self::getLanguageRepresentation($newLanguage, $availableLanguages);

            // Generate new JWT token if user is JWT-authenticated
            self::updateJwtLanguageIfNeeded($newLanguage, $res);

        } catch (\Exception $e) {
            $res->messages['error'][] = "Failed to update language: " . $e->getMessage();
        }

        return $res;
    }

    /**
     * Get language representation with flag icon (like networkfilter_represent pattern)
     *
     * @param string $languageCode Language code (e.g., 'ru', 'en')
     * @param array $availableLanguages Available languages array
     * @return string HTML formatted representation with flag icon
     */
    private static function getLanguageRepresentation(string $languageCode, array $availableLanguages): string
    {
        if (empty($languageCode) || !isset($availableLanguages[$languageCode])) {
            return '';
        }

        $languageInfo = $availableLanguages[$languageCode];
        $flag = $languageInfo['flag'] ?? '';
        $name = $languageInfo['name'] ?? $languageCode;

        // Return HTML with flag icon (Fomantic UI flag format)
        return '<i class="flag ' . $flag . '"></i> ' . $name;
    }

    /**
     * Generate new JWT with updated language for JWT-authenticated users
     *
     * @param string $newLanguage New language code
     * @param PBXApiResult $res API result object to update
     * @return void
     */
    private static function updateJwtLanguageIfNeeded(string $newLanguage, PBXApiResult $res): void
    {
        $di = Di::getDefault();
        if ($di === null || !$di->has('request')) {
            return;
        }

        $request = $di->getShared('request');

        // Check if request has JWT payload (user is JWT-authenticated)
        if (!method_exists($request, 'getJwtPayload')) {
            return;
        }

        $jwtPayload = $request->getJwtPayload();
        if ($jwtPayload === null) {
            return; // Not JWT-authenticated
        }

        // Generate new JWT with updated language
        $newPayload = array_merge($jwtPayload, [
            'language' => $newLanguage
        ]);

        // Generate new access token
        $accessToken = JWTHelper::generate(
            $newPayload,
            JWTHelper::ACCESS_TOKEN_TTL
        );

        // Add token to response
        $res->data['accessToken'] = $accessToken;
        $res->data['tokenType'] = 'Bearer';
        $res->data['expiresIn'] = JWTHelper::ACCESS_TOKEN_TTL;
        $res->messages['info'][] = 'New access token generated with updated language';
    }
}

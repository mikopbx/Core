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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\MailSettings\{
    GetListAction,
    UpdateRecordAction,
    PatchRecordAction,
    TestConnectionAction,
    SendTestEmailAction,
    GetOAuth2UrlAction,
    OAuth2CallbackAction,
    RefreshTokenAction,
    ResetToDefaultsAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for mail settings management
 */
enum MailSettingsAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case RESET = 'reset';

    // Custom actions
    case TEST_CONNECTION = 'testConnection';
    case SEND_TEST_EMAIL = 'sendTestEmail';
    case GET_OAUTH2_URL = 'getOAuth2Url';
    case OAUTH2_CALLBACK = 'oauth2Callback';
    case REFRESH_TOKEN = 'refreshToken';
}

/**
 * Mail settings management processor (v3 API)
 *
 * Handles all mail settings operations using RESTful CRUD operations:
 *
 * RESTful API mapping:
 * - GET /mail-settings            -> getList (all settings)
 * - PUT /mail-settings            -> update (full update)
 * - PATCH /mail-settings          -> patch (partial update)
 * - DELETE /mail-settings         -> reset (reset to defaults)
 * - POST /mail-settings:testConnection    -> testConnection
 * - POST /mail-settings:sendTestEmail     -> sendTestEmail
 * - GET /mail-settings:getOAuth2Url       -> getOAuth2Url
 * - POST /mail-settings:oauth2Callback    -> oauth2Callback
 * - POST /mail-settings:refreshToken      -> refreshToken
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class MailSettingsManagementProcessor extends Injectable
{
    /**
     * Process mail settings requests with type-safe enum matching
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'] ?? [];

        // Add origin from session context for OAuth2 callback URL generation
        // Worker runs in CLI context without $_SERVER['HTTP_HOST'], so we pass it from HTTP context
        if (!empty($request['sessionContext']['origin'])) {
            $data['origin'] = $request['sessionContext']['origin'];
        }

        // Type-safe action matching with enum
        $action = MailSettingsAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            MailSettingsAction::GET_LIST => GetListAction::main($data),
            MailSettingsAction::UPDATE => UpdateRecordAction::main($data),
            MailSettingsAction::PATCH => PatchRecordAction::main($data),
            MailSettingsAction::RESET => ResetToDefaultsAction::main($data),

            // Custom actions
            MailSettingsAction::TEST_CONNECTION => TestConnectionAction::main($data),
            MailSettingsAction::SEND_TEST_EMAIL => SendTestEmailAction::main($data),
            MailSettingsAction::GET_OAUTH2_URL => GetOAuth2UrlAction::main($data),
            MailSettingsAction::OAUTH2_CALLBACK => OAuth2CallbackAction::main($data),
            MailSettingsAction::REFRESH_TOKEN => RefreshTokenAction::main($data)
        };

        $res->function = $actionString;
        return $res;
    }
}
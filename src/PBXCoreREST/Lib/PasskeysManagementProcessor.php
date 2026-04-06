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

use MikoPBX\PBXCoreREST\Lib\Passkeys\{
    GetListAction,
    GetRecordAction,
    UpdateAction,
    DeleteAction,
    CheckAvailabilityAction,
    RegistrationStartAction,
    RegistrationFinishAction,
    AuthenticationStartAction,
    AuthenticationFinishAction
};
use Phalcon\Di\Injectable;

/**
 * Passkey Action Enum
 *
 * Type-safe action definitions for Passkeys management
 */
enum PasskeyAction: string
{
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case UPDATE = 'update';
    case DELETE = 'delete';
    case CHECK_AVAILABILITY = 'checkAvailability';
    case REGISTRATION_START = 'registrationStart';
    case REGISTRATION_FINISH = 'registrationFinish';
    case AUTHENTICATION_START = 'authenticationStart';
    case AUTHENTICATION_FINISH = 'authenticationFinish';
}

/**
 * Passkeys Management Processor
 *
 * Handles all WebAuthn passkey operations:
 * - Registration (authenticated users)
 * - Authentication (public access)
 * - CRUD operations (authenticated users)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class PasskeysManagementProcessor extends Injectable
{
    /**
     * Process passkey management requests
     *
     * @param array $request Request data containing action, data, and sessionContext
     * @return PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'] ?? '';
        $action = PasskeyAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action: {$actionString}";
            return $res;
        }

        $data = $request['data'] ?? [];
        $sessionContext = $request['sessionContext'] ?? [];

        // Route to appropriate action handler
        $res = match ($action) {
            PasskeyAction::GET_LIST => GetListAction::main($sessionContext),
            PasskeyAction::GET_RECORD => GetRecordAction::main($data),
            PasskeyAction::UPDATE => UpdateAction::main($data, $sessionContext),
            PasskeyAction::DELETE => DeleteAction::main($data, $sessionContext),
            PasskeyAction::CHECK_AVAILABILITY => CheckAvailabilityAction::main($data),
            PasskeyAction::REGISTRATION_START => RegistrationStartAction::main($sessionContext, $data),
            PasskeyAction::REGISTRATION_FINISH => RegistrationFinishAction::main($data, $sessionContext),
            PasskeyAction::AUTHENTICATION_START => AuthenticationStartAction::main($data),
            PasskeyAction::AUTHENTICATION_FINISH => AuthenticationFinishAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}

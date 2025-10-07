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

/**
 * WebAuthn Passkey Availability Check Action (PUBLIC)
 *
 * Checks if a user has any registered passkeys without generating challenge.
 * This is a lightweight endpoint for UI to determine if passkey login should be offered.
 * No authentication required - safe to call during login flow.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class CheckAvailabilityAction
{
    /**
     * Check if user has any passkeys registered
     *
     * @param array $data Request data with 'login'
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $login = $data['login'] ?? '';

        if (empty($login)) {
            $res->data = [
                'hasPasskeys' => false,
                'count' => 0
            ];
            $res->success = true;
            return $res;
        }

        // Count passkeys for this login
        $passkeysCount = UserPasskeys::count([
            'conditions' => 'login = :login:',
            'bind' => ['login' => $login]
        ]);

        $res->data = [
            'hasPasskeys' => $passkeysCount > 0,
            'count' => $passkeysCount
        ];
        $res->success = true;

        return $res;
    }
}

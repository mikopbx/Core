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
use MikoPBX\Common\Providers\TranslationProvider;

/**
 * Get List of Passkeys Action
 *
 * Returns all passkeys for the current authenticated user.
 * SECURITY: Only returns user's own passkeys based on sessionContext.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class GetListAction
{
    /**
     * Get list of passkeys for current user
     *
     * @param array $sessionContext Session context with user_name
     * @return PBXApiResult
     */
    public static function main(array $sessionContext): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get login from session context
        $login = $sessionContext['user_name'] ?? '';

        if (empty($login)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_UserNotAuthenticated');
            return $res;
        }

        // Find all passkeys for this user
        $passkeys = UserPasskeys::find([
            'conditions' => 'login = :login:',
            'bind' => ['login' => $login],
            'order' => 'created_at DESC'
        ]);

        // Format for API response
        $res->data = PasskeyDataStructure::getList($passkeys);
        $res->success = true;

        return $res;
    }
}

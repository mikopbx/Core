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

namespace MikoPBX\PBXCoreREST\Lib\Auth;

use MikoPBX\Common\Library\Auth\RedisTokenStorage;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Logout Action - Invalidate refresh token
 *
 * Removes refresh token from database and clears cookie.
 * Requires valid Bearer token in Authorization header.
 *
 * Note: JWT access token cannot be invalidated server-side.
 * It will naturally expire in 15 minutes.
 * Clients should delete access token from memory immediately.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 */
class LogoutAction
{
    /**
     * Process logout request
     *
     * Expects $data to contain:
     * - refreshToken (string, from cookie via controller, optional)
     *
     * Returns PBXApiResult with:
     * - data['message'] - logout confirmation message
     * - data['_cookieData'] - internal cookie instructions to clear cookie
     *
     * @param array<string, mixed> $data Request data with refresh token
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get services via DI (worker context)
        $di = Di::getDefault();
        if ($di === null) {
            $res->messages['error'][] = 'Dependency injection container not available';
            return $res;
        }

        // Read refresh token from data (passed by controller from cookie)
        $refreshToken = $data['refreshToken'] ?? null;

        // No refresh token - already logged out
        if (empty($refreshToken)) {
            $res->data = DataStructure::createLogoutResponse();
            $res->success = true;
            return $res;
        }

        // Delete token from Redis (O(1) operation)
        $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
        $tokenStorage = new RedisTokenStorage($redis);
        $tokenStorage->delete($refreshToken);

        // Return logout response with cookie clear instructions
        $res->data = DataStructure::createLogoutResponse();

        // Add cookie instructions for controller (will be removed before sending to client)
        $res->data['_cookieData'] = [
            'clear_refreshToken' => true
        ];

        $res->success = true;

        return $res;
    }
}

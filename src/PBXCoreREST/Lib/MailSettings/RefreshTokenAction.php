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

namespace MikoPBX\PBXCoreREST\Lib\MailSettings;

use MikoPBX\Core\System\Mail\MailOAuth2Service;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * RefreshTokenAction - refreshes OAuth2 access token
 *
 * Uses the stored refresh token to obtain a new access token
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class RefreshTokenAction
{
    /**
     * Refresh OAuth2 access token
     *
     * @param array<string, mixed> $data Request parameters (unused)
     * @return PBXApiResult Result with refresh status
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $result = MailOAuth2Service::refreshAccessToken();

            if ($result) {
                $res->success = true;
                $res->messages['success'][] = 'Access token refreshed successfully';
                $res->data = [
                    'refreshed' => true,
                    'message' => 'OAuth2 access token has been updated'
                ];
            } else {
                $res->messages['error'][] = 'Failed to refresh access token';
                $res->data = [
                    'refreshed' => false,
                    'message' => 'Could not refresh OAuth2 access token. You may need to re-authorize.'
                ];
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Token refresh error: ' . $e->getMessage();
            $res->data = [
                'refreshed' => false,
                'error' => $e->getMessage()
            ];
        }

        return $res;
    }
}
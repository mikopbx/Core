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

use MikoPBX\Core\System\MailOAuth2Service;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * OAuth2CallbackAction - processes OAuth2 authorization callback
 *
 * Handles the OAuth2 callback from the provider and saves the tokens
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class OAuth2CallbackAction
{
    /**
     * Process OAuth2 callback
     *
     * @param array<string, mixed> $data Request parameters with 'code' and 'state'
     * @return PBXApiResult Result with token save status
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Validate required parameters
            if (empty($data['code'])) {
                $res->messages['error'][] = 'Authorization code not provided';
                return $res;
            }

            if (empty($data['state'])) {
                $res->messages['error'][] = 'State parameter not provided';
                return $res;
            }

            // Process OAuth2 callback
            $result = MailOAuth2Service::handleCallback($data);

            if ($result) {
                $res->success = true;
                $res->messages['success'][] = 'OAuth2 authorization successful';
                $res->data = [
                    'authorized' => true,
                    'message' => 'Email authentication configured successfully'
                ];
            } else {
                $res->messages['error'][] = 'Failed to process OAuth2 callback';
                $res->data = [
                    'authorized' => false,
                    'message' => 'Could not complete OAuth2 authorization'
                ];
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = 'OAuth2 callback error: ' . $e->getMessage();
            $res->data = [
                'authorized' => false,
                'error' => $e->getMessage()
            ];
        }

        return $res;
    }
}
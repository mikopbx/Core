<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Records when an API key was last used.
 *
 * Queued by TokenValidationService from php-fpm (user www, no write access to
 * the main database) and executed here inside WorkerApiCommands (#1120).
 * Not exposed over HTTP: ApiKeys RestController's HttpMapping does not list it.
 */
class TouchLastUsedAction
{
    /**
     * @param array $data ['id' => int, 'timestamp' => int]
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $apiKey = ApiKeys::findFirst((int)($data['id'] ?? 0));
        if ($apiKey === null) {
            $res->messages['error'][] = 'API key not found';
            return $res;
        }

        $apiKey->last_used_at = date('Y-m-d H:i:s', (int)($data['timestamp'] ?? time()));
        $res->success = $apiKey->save();
        if (!$res->success) {
            $res->messages['error'][] = implode(', ', $apiKey->getMessages());
        }

        return $res;
    }
}

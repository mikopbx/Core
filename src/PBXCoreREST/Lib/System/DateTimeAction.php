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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Core\System\System;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

class DateTimeAction extends Injectable
{
    /**
     * @param array<string, mixed> $data
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $httpMethod = $data['httpMethod'] ?? '';

        if ($httpMethod === 'GET') {
            $res->success = true;
            $res->data['timestamp'] = time();
        } elseif ($httpMethod === 'PUT') {
            $timeStamp = intval($data['timestamp'] ?? 0);
            $userTimeZone = $data['userTimeZone'] ?? null;
            $res->success = System::setDate($timeStamp, $userTimeZone);
        } else {
            $res->messages['error'][] = "Invalid HTTP method for datetime: $httpMethod";
        }

        return $res;
    }
}
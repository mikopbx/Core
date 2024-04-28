<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Sysinfo;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Gets an external IP address of the system
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sysinfo
 */
class GetExternalIpInfoAction extends \Phalcon\Di\Injectable
{
    /**
     * Gets an external IP address of the system
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        $curl = curl_init();
        if ($curl === false) {
            $res->messages[] = 'CURL initialization error';

            return $res;
        }
        $url = 'ifconfig.me';
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 2);

        try {
            $resultRequest = curl_exec($curl);
        } catch (\Throwable $e) {
            $res->messages[] = $e->getMessage();
            return $res;
        }
        curl_close($curl);
        if (is_string($resultRequest)) {
            $res->success    = true;
            $res->data['ip'] = $resultRequest;
        } else {
            $res->messages[] = 'Error format data ';
        }

        return $res;
    }
}
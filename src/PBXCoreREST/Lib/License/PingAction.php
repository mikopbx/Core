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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Class PingAction
 * Sends ping request to the license server.
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class PingAction extends \Phalcon\Di\Injectable
{
    /**
     * Sends ping request to the license server.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $license = Di::getDefault()->get(MarketPlaceProvider::SERVICE_NAME);

        // Loop up to 3 attempts
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $result = $license->ping();

            // Return success at the first successful ping
            if ($result['success'] === true) {
                $res->success = true;
                return $res;
            }

            // Wait for 3 seconds before the next attempt, if the previous one was unsuccessful
            // and it's not the last attempt
            if ($attempt < 2) {
                sleep(3);
            }
        }

        // If the code reaches this point, all three attempts have failed
        $res->success = false;
        return $res;
    }
}
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get the SIP secret for the extension sipAPI.js JavaScript script.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sip
 */
class GetSipSecretAction extends \Phalcon\Di\Injectable
{
    /**
     * Get the SIP secret for the AJAX request.
     *
     * @param string $number The extension number
     * @return PBXApiResult Result with SIP secret
     */
    public static function main(string $number): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data['number'] = $number;
        $res->data['secret'] = '';

        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $res->data['secret'] = $extension->Sip->secret??'';
            return $res;
        }
        return $res;
    }
}
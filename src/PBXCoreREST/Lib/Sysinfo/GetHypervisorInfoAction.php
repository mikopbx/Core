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

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Returns hypervisor information
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sysinfo
 */
class GetHypervisorInfoAction extends \Phalcon\Di\Injectable
{
    /**
     * Returns hypervisor information
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        $dmesg = Util::which('dmesg');
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $result = shell_exec("$dmesg | $grep 'Hypervisor detected' | $awk -F 'Hypervisor detected: ' '{ print $2}'");
        $result = trim($result);
        $res->data =['Hypervisor'=>$result];
        if ($result){
            $res->success = true;
        }
        return $res;
    }

}
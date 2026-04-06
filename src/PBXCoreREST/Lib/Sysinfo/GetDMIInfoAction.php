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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Returns DMI information
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sysinfo
 */
class GetDMIInfoAction extends Injectable
{
    /**
     * Returns DMI information, environment type, and CPU architecture
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;

        // WHY: Always return 200 OK, even when DMI not available
        // Containers and some VMs don't expose DMI - this is a valid state, not an error
        $res->httpCode = 200;

        // Get DMI information from dmesg
        $dmesg = Util::which('dmesg');
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $dmiOutput = [];
        Processes::mwExec("$dmesg | $grep DMI | $awk -F 'DMI: ' '{ print $2}'", $dmiOutput);
        $dmiResult = trim(implode(PHP_EOL, $dmiOutput));

        // Get environment type and architecture using pbx-env-detect
        $pbxEnvDetect = '/sbin/pbx-env-detect';
        $envType = '';
        $cpuArch = '';

        if (file_exists($pbxEnvDetect) && is_executable($pbxEnvDetect)) {
            $envOutput = [];
            Processes::mwExec("$pbxEnvDetect --type 2>/dev/null", $envOutput);
            $envType = trim(implode('', $envOutput));

            $archOutput = [];
            Processes::mwExec("$pbxEnvDetect --arch 2>/dev/null", $archOutput);
            $cpuArch = trim(implode('', $archOutput));
        }

        // Build response data
        $res->data = [
            'DMI' => $dmiResult,
            'environment_type' => $envType,
            'cpu_architecture' => $cpuArch,
        ];

        // Consider success if we have at least one piece of information
        if ($dmiResult || $envType || $cpuArch) {
            $res->success = true;
        }

        return $res;
    }
}

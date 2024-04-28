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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Erase log file with the provided name.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class EraseFileAction extends \Phalcon\Di\Injectable
{
    /**
     * Erase log file with the provided name.
     *
     * @param string $filename The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function main(string $filename): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename = System::getLogDir() . '/' . $filename;
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $echoPath = Util::which('echo');
            Processes::mwExec("$echoPath ' ' > $filename");
            $res->success = true;
        }

        return $res;
    }
}
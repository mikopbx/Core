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
use Phalcon\Di;

/**
 * Prepares a downloadable link for a log file with the provided name.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class DownloadLogFileAction extends \Phalcon\Di\Injectable
{
    /**
     * Prepares a downloadable link for a log file with the provided name.
     *
     * @param string $filename The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function main(string $filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename       = System::getLogDir() . '/' . $filename;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $uid          = Util::generateRandomString(36);
            $di           = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir   = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = basename($filename);
            $lnPath    = Util::which('ln');
            $chownPath = Util::which('chown');
            Processes::mwExec("{$lnPath} -s {$filename} {$result_dir}/{$link_name}");
            Processes::mwExec("{$chownPath} www:www {$result_dir}/{$link_name}");
            $res->success          = true;
            $res->data['filename'] = "{$uid}/{$link_name}";
        }

        return $res;
    }
}
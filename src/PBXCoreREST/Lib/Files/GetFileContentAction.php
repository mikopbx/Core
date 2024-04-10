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

namespace MikoPBX\PBXCoreREST\Lib\Files;


use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class GetFileContent
 * Returns file content
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class GetFileContentAction extends \Phalcon\Di\Injectable
{
    /**
     * Returns file content
     *
     * @param string $filename
     * @param bool   $needOriginal
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filename, bool $needOriginal = true): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $customFile     = CustomFiles::findFirst("filepath = '{$filename}'");
        if ($customFile !== null) {
            $filename_orgn = "{$filename}.orgn";
            if ($needOriginal && file_exists($filename_orgn)) {
                $filename = $filename_orgn;
            }
            $res->success = true;
            $cat          = Util::which('cat');
            $di           = Di::getDefault();
            $dirsConfig   = $di->getShared('config');
            $filenameTmp  = $dirsConfig->path('www.downloadCacheDir') . '/' . __FUNCTION__ . '_' .time(). '.conf';
            $cmd          = "{$cat} {$filename} > {$filenameTmp}";
            Processes::mwExec("{$cmd}; chown www:www {$filenameTmp}");
            $res->data['filename'] = $filenameTmp;
        } else {
            $res->success    = false;
            $res->messages[] = 'No access to the file ' . $filename;
        }

        return $res;
    }
}
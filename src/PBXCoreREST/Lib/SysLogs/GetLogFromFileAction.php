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

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Gets partially filtered log file strings.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class GetLogFromFileAction extends \Phalcon\Di\Injectable
{
    /**
     * Gets partially filtered log file strings.
     *
     * @param array $data An array containing the following parameters:
     *                    - filename (string): The name of the log file.
     *                    - filter (string): The filter string.
     *                    - lines (int): The number of lines to return.
     *                    - offset (int): The number of lines to skip.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $filename = (string)($data['filename'] ?? '');
        $filter = (string)($data['filter'] ?? '');
        $lines = (int)($data['lines'] ?? '');
        $offset = (int)($data['offset'] ?? '');

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages[] = 'No access to the file ' . $filename;
        } else {
            $res->success = true;
            $head = Util::which('head');
            $grep = '/bin/grep';
            if (!is_executable($grep)) {
                $grep = Util::which('grep');
            }
            $tail = Util::which('tail');
            $filter = escapeshellarg($filter);
            $linesPlusOffset = $lines + $offset;

            $di = Di::getDefault();
            $cacheDir = Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR);
            if (!file_exists($cacheDir)) {
                Util::mwMkdir($cacheDir, true);
            }
            $filenameTmp = $cacheDir . '/' . __FUNCTION__ . '_' . time() . '.log';
            if (empty($filter)) {
                $cmd = "{$tail} -n {$linesPlusOffset} {$filename}";
            } else {
                $cmd = "{$grep} --text -h -e " . str_replace('&', "' -e '", $filter) . " -F {$filename} | $tail -n {$linesPlusOffset}";
            }
            if ($offset > 0) {
                $cmd .= " | {$head} -n {$lines}";
            }

            $sedPath = Util::which('sed');
            $cmd .= ' | ' . $sedPath . ' -E \'s/\\\\([tnrfvb]|040)/ /g\'';
            $cmd .= " > $filenameTmp";

            Processes::mwExec("$cmd; chown www:www $filenameTmp");
            $res->data['cmd'] = $cmd;
            $res->data['filename'] = $filenameTmp;
        }

        return $res;
    }
}
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

use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Returns list of log files to show them on web interface
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class GetLogsListAction extends \Phalcon\Di\Injectable
{
    public const DEFAULT_FILENAME = 'asterisk/messages';

    /**
     * Returns list of log files to show them on web interface
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $logDir = System::getLogDir();
        $filesList = [];
        $entries = self::scanDirRecursively($logDir);
        $entries = Util::flattenArray($entries);
        $defaultFound = false;
        foreach ($entries as $entry) {
            $fileSize = filesize($entry);
            $now = time();
            if ($fileSize === 0
                || $now - filemtime($entry) > 604800 // Older than 10 days
            ) {
                continue;
            }
            $relativePath = str_ireplace($logDir . '/', '', $entry);
            $fileSizeKB = ceil($fileSize / 1024);
            $default = ($relativePath === self::DEFAULT_FILENAME);
            $filesList[$relativePath] =
                [
                    'path' => $relativePath,
                    'size' => "{$fileSizeKB} kb",
                    'default' => $default,
                ];
            if ($default) {
                $defaultFound = true;
            }
        }
        if (!$defaultFound) {
            if (isset($filesList['system/messages'])) {
                $filesList['system/messages']['default'] = true;

            } else {
                $filesList[array_key_first($filesList)]['default'] = true;
            }
        }
        ksort($filesList);
        $res->success = true;
        $res->data['files'] = $filesList;
        return $res;
    }

    /**
     * Scans a directory just like scandir(), only recursively
     * returns a hierarchical array representing the directory structure
     *
     * @param string $dir directory to scan
     *
     * @return array
     */
    private static function scanDirRecursively(string $dir): array
    {
        $list = [];

        //get directory contents
        foreach (scandir($dir) as $d) {
            //ignore any of the files in the array
            if (in_array($d, ['.', '..'])) {
                continue;
            }
            //if current file ($d) is a directory, call scanDirRecursively
            if (is_dir($dir . '/' . $d)) {
                $list[] = self::scanDirRecursively($dir . '/' . $d);
                //otherwise, add the file to the list
            } elseif (is_file($dir . '/' . $d) || is_link($dir . '/' . $d)) {
                $list[] = $dir . '/' . $d;
            }
        }

        return $list;
    }
}
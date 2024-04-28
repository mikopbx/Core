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

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Requests a zipped archive containing logs and PCAP file
 * Checks if archive ready it returns a download link.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class DownloadLogsArchiveAction extends \Phalcon\Di\Injectable
{
    /**
     * Requests a zipped archive containing logs and PCAP file
     * Checks if archive ready it returns a download link.
     *
     * @param string $resultFile
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $resultFile): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $progress_file = "{$resultFile}.progress";
        if (!file_exists($progress_file)) {
            $res->messages[] = 'Archive does not exist. Try again!';
        } elseif (file_exists($progress_file) && file_get_contents($progress_file) === '100') {
            $uid = Util::generateRandomString(36);
            $di = Di::getDefault();
            $downloadLink = $di->getShared('config')->path('www.downloadCacheDir');
            $result_dir = "{$downloadLink}/{$uid}";
            Util::mwMkdir($result_dir);
            $link_name = 'MikoPBXLogs_' . basename($resultFile);
            Util::createUpdateSymlink($resultFile, "{$result_dir}/{$link_name}");
            Util::addRegularWWWRights("{$result_dir}/{$link_name}");
            $res->success = true;
            $res->data['status'] = "READY";
            $res->data['filename'] = "{$uid}/{$link_name}";
        } else {
            $res->success = true;
            $res->data['status'] = "PREPARING";
            $res->data['progress'] = file_get_contents($progress_file);
        }

        return $res;
    }
}
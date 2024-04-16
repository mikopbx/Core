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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerMakeLogFilesArchive;
use Phalcon\Di;

/**
 * Stops tcpdump and starts creating a log files archive for download.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class PrepareLogAction extends \Phalcon\Di\Injectable
{
    /**
     * Stops tcpdump and starts creating a log files archive for download.
     *
     * @param bool $tcpdumpOnly Indicates whether to include only tcpdump logs.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(bool $tcpdumpOnly): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        $dirsConfig = $di->getShared('config');
        $temp_dir = $dirsConfig->path('core.tempDir');

        $prefix = $tcpdumpOnly ? 'tcpdump' : 'sys';
        $futureFileName = $temp_dir . '/log-' . $prefix . '-' . time() . '.zip';
        $res->data['filename'] = $futureFileName;
        $res->success = true;
        // Create background task
        $merge_settings = [];
        $merge_settings['result_file'] = $futureFileName;
        $merge_settings['tcpdump_only'] = $tcpdumpOnly;

        if ($tcpdumpOnly) {
            Processes::killByName('timeout');
            Processes::killByName('tcpdump');
        }
        $settings_file = "{$temp_dir}/log-settings-" . $prefix . ".json";
        file_put_contents($settings_file, json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        $phpPath = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMakeLogFilesArchive::class);
        Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");

        return $res;
    }
}
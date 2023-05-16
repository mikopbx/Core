<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\SysinfoManagementProcessor;
use Throwable;

class WorkerMakeLogFilesArchive extends WorkerBase
{
    public function start($argv): void
    {
        $settings_file = $argv[2] ?? '';
        if ( ! file_exists($settings_file)) {
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'File with settings not found', LOG_ERR);

            return;
        }
        $file_data = json_decode(file_get_contents($settings_file), true);
        if ( ! isset($file_data['result_file'])) {
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'Wrong settings', LOG_ERR);

            return;
        }
        $tcpdump_only  = $file_data['tcpdump_only'] ?? true;
        $resultFile    = $file_data['result_file'];
        $progress_file = "{$resultFile}.progress";
        file_put_contents($progress_file, '1');

        $rmPath   = Util::which('rm');
        $za7Path  = Util::which('7za');
        $findPath = Util::which('find');

        if (file_exists($resultFile)) {
            Processes::mwExec("{$rmPath} -rf {$resultFile}");
        }
        $logDir         = System::getLogDir();
        $systemInfoFile = "{$logDir}/system-information.log";
        if ($tcpdump_only) {
            $command = "{$findPath} {$logDir}/tcpDump -type f ";
        } else {
            // Collect system info
            file_put_contents($systemInfoFile, SysinfoManagementProcessor::prepareSysyinfoContent());
            $command = "{$findPath} {$logDir} -type f ";
        }
        Processes::mwExec($command, $out);

        $countFiles = count($out);
        foreach ($out as $index => $filename) {
            if ( ! file_exists($filename)) {
                continue;
            }
            Processes::mwExec("{$za7Path} a -tzip -spf '{$resultFile}' '{$filename}'", $out);
            $progress = round(100 * ($index + 1) / $countFiles);
            if ($progress % 5 === 0) {
                file_put_contents($progress_file, $progress);
                echo "$progress \n";
            }
        }
        file_put_contents($progress_file, '100');
        if ($tcpdump_only === true) {
            // Delete TCP dump
            Processes::mwExec("{$rmPath} -rf {$logDir}/tcpDump");
        }
        Processes::mwExec("{$rmPath} -rf $systemInfoFile $settings_file");
    }
}

// Start worker process
WorkerMakeLogFilesArchive::startWorker($argv ?? null);

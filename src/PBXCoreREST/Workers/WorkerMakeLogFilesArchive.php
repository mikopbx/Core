<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Sysinfo\GetInfoAction;
use ZipArchive;


/**
 * The WorkerMakeLogFilesArchive class is responsible for archiving log files.
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerMakeLogFilesArchive extends WorkerBase
{
    private string $progress_file = '';

    /**
     * Starts the log files archiving worker process.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $settings_file = $argv[2] ?? '';

        // Check if the settings file exists
        if ( ! file_exists($settings_file)) {
            SystemMessages::sysLogMsg("WorkerMakeLogFilesArchive", 'File with settings not found', LOG_ERR);

            return;
        }
        $file_data = json_decode(file_get_contents($settings_file), true);

        // Check if the 'result_file' key is present in the settings file
        if ( ! isset($file_data['result_file'])) {
            SystemMessages::sysLogMsg("WorkerMakeLogFilesArchive", 'Wrong settings', LOG_ERR);

            return;
        }
        $tcpdump_only  = $file_data['tcpdump_only'] ?? true;
        $resultFile    = $file_data['result_file'];
        $this->progress_file = "{$resultFile}.progress";
        file_put_contents($this->progress_file, '1');

        $rmPath   = Util::which('rm');
        $findPath = Util::which('find');

        // Remove the result file if it already exists
        if (file_exists($resultFile)) {
            Processes::mwExec("{$rmPath} -rf {$resultFile}");
        }
        $logDir         = System::getLogDir();
        $systemInfoFile = "{$logDir}/system-information.log";
        if ($tcpdump_only) {
            $command = "{$findPath} {$logDir}/tcpDump -type f ";
        } else {
            // Collect system info
            file_put_contents($systemInfoFile, GetInfoAction::prepareSysyinfoContent());
            $command = "{$findPath} {$logDir} -type f ";
        }
        Processes::mwExec($command, $out);
        $zip     = new ZipArchive();

        $storageDir = '';
        Storage::isStorageDiskMounted('',$storageDir);
        if($zip->open($resultFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true){
            foreach ($out as $filename) {
                if ( !file_exists($filename)) {
                    continue;
                }
                $zip->addFile($filename, str_replace("$storageDir/mikopbx/", '', $filename));
            }
            if(version_compare(PHP_VERSION, '8.0.0') >= 0){
                $zip->registerProgressCallback(0.05, [$this, "progress"]);
            }
            $zip->close();
        }
        file_put_contents($this->progress_file, '100');
        if ($tcpdump_only === true) {
            // Delete TCP dump
            Processes::mwExec("{$rmPath} -rf {$logDir}/tcpDump");
        }
        Processes::mwExec("{$rmPath} -rf $systemInfoFile $settings_file");
    }

    public function progress($rate):void
    {
        $progress = round($rate * 100);
        if ($progress % 5 === 0) {
            file_put_contents($this->progress_file, $progress);
        }
    }
}

// Start the log files archiving worker process
WorkerMakeLogFilesArchive::startWorker($argv ?? []);

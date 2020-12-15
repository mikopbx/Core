<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use Throwable;

class WorkerMakeLogFilesArchive extends WorkerBase
{
    public function start($argv): void
    {
        $settings_file = trim($argv[1]);
        if ( ! file_exists($settings_file)) {
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'File with settings not found', LOG_ERR);
            return;
        }
        $file_data = json_decode(file_get_contents($settings_file), true);
        if ( ! isset($file_data['result_file'])) {
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'Wrong settings', LOG_ERR);
            return;
        }
        $resultFile = $file_data['result_file'];
        $progress_file = "{$resultFile}.progress";
        file_put_contents($progress_file, '0');

        $rmPath      = Util::which('rm');
        $za7Path     = Util::which('7za');

        if (file_exists($resultFile)) {
            Processes::mwExec("{$rmPath} -rf {$resultFile}");
        }

        $logDir = System::getLogDir();
        Processes::mwExec("{$za7Path} a -tzip -mx5 -spf '{$resultFile}' '{$logDir}'");
        $tcpDumpDir = "{$logDir}/tcpDump";
        file_put_contents($progress_file, '100');

        // Delete TCP dump
        Processes::mwExec("{$rmPath} -rf $tcpDumpDir");
    }
}

// Start worker process
$workerClassname = WorkerMakeLogFilesArchive::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
    }
}

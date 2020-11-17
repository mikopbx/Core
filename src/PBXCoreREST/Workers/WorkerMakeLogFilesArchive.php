<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

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
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'File with settings not found');
            return;
        }
        $file_data = json_decode(file_get_contents($settings_file), true);
        if ( ! isset($file_data['result_file'])) {
            Util::sysLogMsg("WorkerMakeLogFilesArchive", 'Wrong settings');
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
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}

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

class WorkerMakeLogFilesArchive extends WorkerBase
{
    public function start($argv): void
    {
        if (count($argv) <= 1) {
            // No any arguments
            exit(2);
        }
        $settings_file = trim($argv[1]);
        if ( ! file_exists($settings_file)) {
            // File with settings not found
            exit(3);
        }
        $file_data = json_decode(file_get_contents($settings_file), true);
        if ( ! isset($file_data['result_file'])) {
            // Wrong settings
            exit(4);
        }
        $resultFile = $file_data['result_file'];
        $progress_file = "{$resultFile}.progress";
        file_put_contents($progress_file, '0');

        $rmPath      = Util::which('rm');
        $za7Path     = Util::which('7za');

        if (file_exists($resultFile)) {
            Util::mwExec("{$rmPath} -rf {$resultFile}");
        }

        $logDir = System::getLogDir();
        Util::mwExec("{$za7Path} a -tzip -mx5 -spf '{$resultFile}' '{$logDir}'");
        $tcpDumpDir = "{$logDir}/tcpDump";
        file_put_contents($progress_file, '100');

        // Delete TCP dump
        Util::mwExec("{$rmPath} -rf $tcpDumpDir");
    }
}

// Start worker process
$workerClassname = WorkerMakeLogFilesArchive::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}

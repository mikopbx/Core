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

        Util::killByName('timeout');
        Util::killByName('tcpdump');

        $rmPath      = Util::which('rm');
        $findPath    = Util::which('find');
        $za7Path     = Util::which('7za');
        $cpPath      = Util::which('cp');
        $dir_all_log = System::getLogDir();
        $dirlog      = $dir_all_log . '/dir_start_all_log';
        Util::mwMkdir($dirlog);

        $log_dir = System::getLogDir();
        Util::mwExec("{$cpPath} -R {$log_dir} {$dirlog}");

        if (file_exists($resultFile)) {
            Util::mwExec("{$rmPath} -rf {$resultFile}");
        }
        // Пакуем логи.
        Util::mwExec("{$za7Path} a -tzip -mx5 -spf '{$resultFile}' '{$dirlog}'");

        // Удаляем логи. Оставляем только архив.
        Util::mwExec("{$findPath} {$dir_all_log}" . '/ -name *_start_all_log | xargs rm -rf');

        // Удаляем каталог логов.
        Util::mwExecBg("{$rmPath} -rf {$dirlog}");

        file_put_contents($progress_file, '100');
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

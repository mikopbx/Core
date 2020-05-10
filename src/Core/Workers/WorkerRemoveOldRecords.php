<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Core\System\{Storage, Util};

require_once 'globals.php';

class WorkerRemoveOldRecords extends WorkerBase
{

    public function start($argv): void
    {
        $varEtcPath = $this->di->getShared('config')->path('core.varEtcPath');
        $filename   = "{$varEtcPath}/storage_device";
        if (file_exists($filename)) {
            $mount_point = file_get_contents($filename);
        } else {
            exit(0);
        }
        $out = [];
        Util::mwExec("/bin/mount | /bin/busybox grep {$mount_point} | /bin/busybox awk '{print $1}' | head -n 1", $out);
        $dev = implode('', $out);

        $s          = new Storage();
        $MIN_SPACE  = 100; // MB
        $free_space = $s->getFreeSpace($dev);
        if ($free_space > $MIN_SPACE) {
            // Очистка диска не требуется.
            exit(0);
        }
        $monitor_dir = Storage::getMonitorDir();
        $out         = [];
        $count_dir   = 1;
        Util::mwExec(
            "/bin/find {$monitor_dir}*/*/*  -maxdepth 0 -type d  -printf '%T+ %p\n' 2> /dev/null | /bin/sort | /bin/head -n 10 | /bin/busybox awk '{print $2}'",
            $out
        );
        foreach ($out as $dir_info) {
            if ( ! is_dir($dir_info)) {
                echo 'error';
                continue;
            }
            $free_space = $s->getFreeSpace($dev);
            if ($free_space > $MIN_SPACE) {
                // Очистка диска не требуется.
                break;
            }
            // Util::mwExec("/bin/find {$dir_info}/* -name *.mp3", $out);
            Util::mwExec("/bin/busybox rm -rf {$dir_info}");
            // @file_put_contents("{$dir_info}/removed_file.txt", implode("\n",$out));
        }
    }
}

// Start worker process
$workerClassname = WorkerRemoveOldRecords::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}
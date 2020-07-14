<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';
use MikoPBX\Core\System\{System, Util};
use Nats\Message;
use Phalcon\Exception;


class WorkerMergeUploadedFile extends WorkerBase
{
    public function start($argv): void
    {
        if (count($argv) <= 1) {
            // Не переданы аргументы.
            exit(2);
        }
        $settings_file = trim($argv[1]);
        if ( ! file_exists($settings_file)) {
            // Не найлен файл с настройками.
            exit(3);
        }
        $file_data = json_decode(file_get_contents($settings_file), true);
        if ( ! isset($file_data['action'])) {
            // Не корректный формат файла с настройками.
            exit(4);
        }

        if ($file_data['action'] === 'merge') {
            $settings = $file_data['data'];
            if ( ! file_exists($settings['result_file'])) {
                Util::mergeFilesInDirectory(
                    $settings['temp_dir'],
                    $settings['resumableFilename'],
                    $settings['resumableTotalChunks'],
                    $settings['result_file'],
                    dirname($settings['result_file'])
                );
            }
            $res = file_exists($settings['result_file']);
            // Отложенное удаление файла.
            $rm_file = basename(dirname($settings['result_file'])) === 'tmp' ? $settings['result_file'] : dirname(
                $settings['result_file']
            );
            Util::mwExecBg(
                '/etc/rc/shell_functions.sh killprocesses ' . $rm_file . ' -TERM 0;rm -rf ' . $rm_file,
                '/dev/null',
                120
            );
        }
    }

}


// Start worker process
$workerClassname = WorkerMergeUploadedFile::class;
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

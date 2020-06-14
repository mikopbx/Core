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

        if ('upload_backup' === $file_data['action']) { // TODO::Возможно это надо перенести в Backup воркер
            $settings = $file_data['data'];
            $res_file = "{$settings['backupdir']}/{$settings['dir_name']}/resultfile.{$settings['extension']}";

            if ( ! file_exists($res_file) && file_exists($settings['temp_dir'])) {
                Util::mergeFilesInDirectory(
                    $settings['temp_dir'],
                    $settings['resumableFilename'],
                    $settings['resumableTotalChunks'],
                    $res_file
                );
            }
            $request = [
                'data'   => [
                    'res_file' => $res_file,
                    'mnt_point' => $settings['mnt_point'],
                    'backupdir' => $settings['backupdir'],
                    'dir_name' => $settings['dir_name'],
                    'extension' => $settings['extension'],
                ],
                'action' => 'upload' // Операция.
            ];

            try {
                $client = $this->di->get('natsConnection');
                $client->connect(10);
                $cb = function (Message $message) use ($settings) {
                    $result_data = json_decode($message->getBody(), true);
                    if ($result_data['result'] === 'Success') {
                        $status = 'COMPLETE';
                    } else {
                        $status = 'ERROR';
                    }
                    file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", $status);
                };
                $client->request('backup', json_encode($request), $cb);
            } catch (Exception $e) {
            }
        } elseif ($file_data['action'] === 'convertConfig') {
            $settings = $file_data['data'];
            $res_file = "{$settings['backupdir']}/{$settings['dir_name']}/resultfile.{$settings['extension']}";

            if ( ! file_exists($res_file) && file_exists($settings['temp_dir'])) {
                Util::mergeFilesInDirectory(
                    $settings['temp_dir'],
                    $settings['resumableFilename'],
                    $settings['resumableTotalChunks'],
                    $res_file
                );
            }

            $res = file_exists($res_file);
            if ($res !== true) {
                file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", 'ERROR');
                exit(1);
            }
            try {
                $result = System::convertConfig($res_file);
                $status = 'COMPLETE';
            } catch (Exception $e) {
                $status = 'ERROR';
            }
            file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", $status);
        } elseif ($file_data['action'] === 'merge') {
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
                30
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

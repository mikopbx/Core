<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;


class WorkerMergeUploadedFile extends WorkerBase
{
    public function start($argv): void
    {
        $settings_file = trim($argv[1]);
        if ( ! file_exists($settings_file)) {
            Util::sysLogMsg("WorkerMergeUploadedFile", 'File with settings not found');

            return;
        }
        $settings = json_decode(file_get_contents($settings_file), true);
        $progress_file = $settings['tempDir'] . '/merging_progress';
        $this->mergeFilesInDirectory(
            $settings['tempDir'],
            $settings['resumableFilename'],
            $settings['resumableTotalChunks'],
            $settings['fullUploadedFileName'],
            $progress_file
        );

        // Check filesize is equal uploaded size
        $resultFileSize = filesize($settings['fullUploadedFileName']);
        if ((int)$settings['resumableTotalSize'] === $resultFileSize){
            file_put_contents($progress_file, '100');
        } else {
            Util::sysLogMsg('UploadFile', "File {$settings['fullUploadedFileName']} size {$resultFileSize} does not equal {$settings['resumableTotalSize']}");
        }

        // Delete uploaded file after 10 minutes
        Util::mwExecBg(
            '/sbin/shell_functions.sh killprocesses ' . $settings['tempDir'] . ' -TERM 0;rm -rf ' . $settings['tempDir'],
            '/dev/null',
            600
        );
    }

    /**
     * Glues uploaded parts of file to en one with fileName
     *
     * @param string $tempDir
     * @param string $fileName
     * @param int    $total_files
     * @param string $result_file
     * @param string $progress_file
     */
    private function mergeFilesInDirectory(
        string $tempDir,
        string $fileName,
        int $total_files,
        string $result_file,
        string $progress_file
    ): void {
        file_put_contents($progress_file, '0');
        // Restore original file from chunks
        if (($fp = fopen($result_file, 'w')) !== false) {
            for ($i = 1; $i <= $total_files; $i++) {
                $tmp_file = $tempDir . '/' . $fileName . '.part' . $i;
                fwrite($fp, file_get_contents($tmp_file));
                unlink($tmp_file);
                $currentProgress = round($i / $total_files * 100)-1; //Up to 99%
                file_put_contents($progress_file, $currentProgress, 2);
            }
            fclose($fp);
        } else {
            Util::sysLogMsg('UploadFile', 'cannot create the destination file - ' . $result_file);

            return;
        }
        Util::sysLogMsg('UploadFile', 'destination file - ' . $result_file);
    }
}

// Start worker process
$workerClassname = WorkerMergeUploadedFile::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Error $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}

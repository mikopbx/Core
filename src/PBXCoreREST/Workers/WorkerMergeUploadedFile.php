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
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use Throwable;


class WorkerMergeUploadedFile extends WorkerBase
{
    /**
     * @param mixed $params
     */
    public function start($params): void
    {
        $settings_file = $params[2]??'';
        if ( ! file_exists($settings_file)) {
            Util::sysLogMsg(__CLASS__, 'File with settings not found', LOG_ERR);

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
        if ((int)$settings['resumableTotalSize'] === $resultFileSize) {
            file_put_contents($progress_file, '100');
        } else {
            Util::sysLogMsg(
                'UploadFile',
                "File {$settings['fullUploadedFileName']} size {$resultFileSize} does not equal {$settings['resumableTotalSize']}",
                LOG_ERR
            );
        }

        // Delete uploaded file after 10 minutes
        Processes::mwExecBg(
            '/sbin/shell_functions.sh killprocesses ' . $settings['tempDir'] . ' -TERM 0;rm -rf ' . $settings['tempDir'],
            '/dev/null',
            600
        );
    }

    /**
     * Merges uploaded parts of file to en one with fileName
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
        if (($fp = fopen($result_file, 'wb')) !== false) {
            for ($i = 1; $i <= $total_files; $i++) {
                $tmp_file = $tempDir . '/' . $fileName . '.part' . $i;
                fwrite($fp, file_get_contents($tmp_file));
                unlink($tmp_file);
                $currentProgress = round($i / $total_files * 100);
                $currentProgress = $currentProgress < 99 ? $currentProgress : 99;
                file_put_contents($progress_file, $currentProgress, 2);
            }
            fclose($fp);
        } else {
            Util::sysLogMsg('UploadFile', 'cannot create the destination file - ' . $result_file, LOG_ERR);

            return;
        }
        Util::sysLogMsg('UploadFile', 'destination file - ' . $result_file, LOG_NOTICE);
    }
}

// Start worker process
WorkerMergeUploadedFile::startWorker($argv??null);
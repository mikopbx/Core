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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFileAction;
use Phalcon\Di\Di;


/**
 * The WorkerMergeUploadedFile class is responsible for merging uploaded files into one file.
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerMergeUploadedFile extends WorkerBase
{
    private EventBusProvider $eventBus;
    private string $uploadId;
    /**
     * Starts the process to merge uploaded files into one.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $settings_file = $argv[2] ?? '';

        // Check if the settings file exists
        if (! file_exists($settings_file)) {
            SystemMessages::sysLogMsg(__CLASS__, 'File with settings not found', LOG_ERR);

            return;
        }
        $settings = json_decode(file_get_contents($settings_file), true);

        // Initialize EventBus
        $di = Di::getDefault();
        $this->eventBus = $di->getShared(EventBusProvider::SERVICE_NAME);

        // Extract upload ID from settings and set up channel
        $this->uploadId = basename($settings['tempDir']);
        $this->channelId = "file-upload-{$this->uploadId}";

        // Send merge started event
        $this->publishEvent('merge-started', [
            'progress' => 0,
            'status' => FilesConstants::UPLOAD_MERGING
        ]);

        $progress_file = $settings['tempDir'] . '/merging_progress';
        $this->mergeFilesInDirectory(
            $settings['tempDir'],
            $settings['resumableFilename'],
            $settings['resumableTotalChunks'],
            $settings['fullUploadedFileName'],
            $progress_file
        );

        // Check if the merged file size is equal to the uploaded size
        $resultFileSize = filesize($settings['fullUploadedFileName']);
        if ((int)$settings['resumableTotalSize'] !== $resultFileSize) {
            $errorMessage = "File {$settings['fullUploadedFileName']} size $resultFileSize does not equal {$settings['resumableTotalSize']}";
            SystemMessages::sysLogMsg('UploadFile', $errorMessage, LOG_ERR);

            // Send error event
            $this->publishEvent('upload-error', [
                'error' => $errorMessage,
                'status' => 'ERROR'
            ]);

            // Delete uploaded file after 10 minutes
            Processes::mwExecBg(
                '/sbin/shell_functions.sh killprocesses ' . $settings['tempDir'] . ' -TERM 0;rm -rf ' . $settings['tempDir'],
                '/dev/null',
                600
            );
            return;
        }

        // Validate file content matches declared category using magic bytes
        $category = $settings['category'] ?? 'unknown';
        $magicResult = UploadFileAction::validateMagicBytes($settings['fullUploadedFileName'], $category);
        if (!$magicResult['valid']) {
            $errorMessage = "Magic bytes validation failed for {$settings['fullUploadedFileName']}: {$magicResult['error']}";
            SystemMessages::sysLogMsg('UploadFile', $errorMessage, LOG_ERR);

            // Delete the suspicious file immediately
            unlink($settings['fullUploadedFileName']);

            file_put_contents($progress_file, 'VALIDATION_FAILED');

            $this->publishEvent('upload-error', [
                'error' => $magicResult['error'],
                'status' => FilesConstants::UPLOAD_FAILED
            ]);

            // Delete temp dir after 10 minutes
            Processes::mwExecBg(
                '/sbin/shell_functions.sh killprocesses ' . $settings['tempDir'] . ' -TERM 0;rm -rf ' . $settings['tempDir'],
                '/dev/null',
                600
            );
            return;
        }

        file_put_contents($progress_file, '100');

        // Send completion event
        $this->publishEvent('merge-complete', [
            'progress' => 100,
            'status' => FilesConstants::UPLOAD_COMPLETE,
            'filePath' => $settings['fullUploadedFileName'],
            'fileSize' => $resultFileSize
        ]);

        // Delete uploaded file after 10 minutes
        Processes::mwExecBg(
            '/sbin/shell_functions.sh killprocesses ' . $settings['tempDir'] . ' -TERM 0;rm -rf ' . $settings['tempDir'],
            '/dev/null',
            600
        );
    }

    /**
     * Merges uploaded parts of a file into one with the specified file name.
     *
     * @param string $tempDir The temporary directory where the uploaded parts are stored.
     * @param string $fileName The name of the file being merged.
     * @param int $total_files The total number of parts to merge.
     * @param string $result_file The resulting merged file.
     * @param string $progress_file The file to track the progress of the merging process.
     * @return void
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
                if (!file_exists($tmp_file)) {
                    fclose($fp);
                    $errorMessage = "Chunk file missing: $tmp_file (part $i of $total_files)";
                    SystemMessages::sysLogMsg('UploadFile', $errorMessage, LOG_ERR);
                    $this->publishEvent('upload-error', [
                        'error' => $errorMessage,
                        'status' => 'ERROR'
                    ]);
                    return;
                }
                fwrite($fp, file_get_contents($tmp_file));
                unlink($tmp_file);
                $currentProgress = round($i / $total_files * 100);
                $currentProgress = $currentProgress < 99 ? $currentProgress : 99;
                file_put_contents($progress_file, (string)$currentProgress, LOCK_EX);

                // Publish progress event via EventBus
                $this->publishEvent('merge-progress', [
                    'progress' => $currentProgress,
                    'status' => FilesConstants::UPLOAD_MERGING
                ]);
            }
            fclose($fp);
        } else {
            $errorMessage = 'cannot create the destination file - ' . $result_file;
            SystemMessages::sysLogMsg('UploadFile', $errorMessage, LOG_ERR);

            // Publish error event
            $this->publishEvent('upload-error', [
                'error' => $errorMessage,
                'status' => 'ERROR'
            ]);

            return;
        }
        SystemMessages::sysLogMsg('UploadFile', 'destination file - ' . $result_file, LOG_NOTICE);
    }

    /**
     * Publishes an event to the EventBus for this upload session
     *
     * @param string $type Event type
     * @param array $data Event data
     * @return void
     */
    private function publishEvent(string $type, array $data): void
    {
        try {
            $this->eventBus->publish('file-upload', [
                'event' => $type,
                'data' => array_merge([
                    'uploadId' => $this->uploadId,
                    'timestamp' => time()
                ], $data)
            ]);
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Failed to publish event: ' . $e->getMessage(), LOG_ERR);
        }
    }
}

// Start a worker process
WorkerMergeUploadedFile::startWorker($argv ?? []);

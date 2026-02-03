<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Models\{PbxSettings, RecordingStorage, StorageSettings};
use MikoPBX\Core\System\{Directories, Storage, SystemMessages};
use MikoPBX\Core\System\Storage\S3Client;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * WorkerS3Upload - Background worker for uploading old recordings to S3
 *
 * This worker implements two upload strategies:
 * 1. Age-based upload: Files older than PBX_RECORD_S3_LOCAL_DAYS are uploaded to S3
 * 2. Low-space trigger: When free space < 500MB, upload oldest files to free disk space
 *
 * After successful upload:
 * - Updates RecordingStorage mapping (storage_location='s3', s3_key, uploaded_at)
 * - Deletes local file to free disk space
 * - Keeps CDR.recordingfile unchanged for backward compatibility
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerS3Upload extends WorkerBase
{
    /**
     * Minimum free space threshold in MB
     * When disk space falls below this, oldest recordings are uploaded to S3
     */
    private const int MIN_SPACE_MB = 500;

    /**
     * Batch size for processing files in one iteration
     * Prevents excessive memory usage and allows graceful shutdown
     */
    private const int BATCH_SIZE = 50;

    /**
     * Sleep interval between iterations in seconds
     * Prevents excessive CPU usage and allows time for new recordings
     */
    private const int SLEEP_INTERVAL = 300; // 5 minutes

    /**
     * Check interval for supervisor monitoring (seconds)
     *
     * @return int Interval for WorkerSafeScriptsCore to check this worker
     */
    public static function getCheckInterval(): int
    {
        return 300; // Check every 5 minutes
    }

    /**
     * Start worker and process recordings upload
     *
     * Main loop:
     * 1. Check if S3 is enabled
     * 2. Determine upload strategy (age-based or low-space trigger)
     * 3. Process batch of recordings
     * 4. Sleep and repeat
     *
     * @param array $argv Command-line arguments
     * @return void
     */
    public function start(array $argv): void
    {
        // Check if S3 storage is enabled before starting
        $settings = StorageSettings::getSettings();
        if ($settings->s3_enabled !== 1 || !$settings->isS3Configured()) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'S3 storage not configured - worker exiting',
                LOG_DEBUG
            );
            return;
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Worker started (PID:%d)', getmypid()),
            LOG_INFO
        );

        while ($this->needRestart === false) {
            pcntl_signal_dispatch();

            try {

                // Determine upload strategy
                $needsEmergencyUpload = $this->checkLowDiskSpace();

                if ($needsEmergencyUpload) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        'Low disk space detected - emergency upload triggered',
                        LOG_WARNING
                    );
                    $this->processEmergencyUpload();
                } else {
                    // Normal age-based upload
                    $this->processAgeBasedUpload();
                }

            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Worker error: %s', $e->getMessage()),
                    LOG_ERR
                );
            }

            sleep(self::SLEEP_INTERVAL);
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            'Worker stopped gracefully',
            LOG_INFO
        );
    }

    /**
     * Check if disk space is critically low
     *
     * @return bool True if free space < MIN_SPACE_MB
     */
    private function checkLowDiskSpace(): bool
    {
        $storage = new Storage();
        $hdd = $storage->getAllHdd(true);

        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true && !Storage::isStorageDiskMounted("{$disk['id']}4")) {
                continue; // Skip unmounted system disk
            }

            if ($disk['free_space'] < self::MIN_SPACE_MB) {
                return true;
            }
        }

        return false;
    }

    /**
     * Process emergency upload when disk space is low
     *
     * Strategy: Upload oldest local recordings until free space > MIN_SPACE_MB
     *
     * @return void
     */
    private function processEmergencyUpload(): void
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $files = $this->findOldestRecordings($monitorDir, self::BATCH_SIZE * 2);

        $uploadedCount = 0;

        foreach ($files as $filePath) {
            if (!$this->checkLowDiskSpace()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Disk space recovered after uploading %d files', $uploadedCount),
                    LOG_INFO
                );
                break;
            }

            if ($this->uploadRecordingToS3($filePath)) {
                $uploadedCount++;
            }

            pcntl_signal_dispatch();
            if ($this->needRestart) {
                break;
            }
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Emergency upload completed: %d files uploaded', $uploadedCount),
            LOG_NOTICE
        );
    }

    /**
     * Process age-based upload for recordings older than local retention period
     *
     * Strategy: Upload recordings older than PBX_RECORD_S3_LOCAL_DAYS
     *
     * @return void
     */
    private function processAgeBasedUpload(): void
    {
        // Get local retention period setting
        $localRetentionDays = (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS);
        if ($localRetentionDays <= 0) {
            $localRetentionDays = 7; // Default fallback
        }

        $expirationTime = time() - ($localRetentionDays * 86400);
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Starting age-based upload (retention: %d days)', $localRetentionDays),
            LOG_DEBUG
        );

        // Find recordings older than retention period
        $files = $this->findRecordingsOlderThan($monitorDir, $expirationTime, self::BATCH_SIZE);

        if (empty($files)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'No recordings found for age-based upload',
                LOG_DEBUG
            );
            return;
        }

        $uploadedCount = 0;

        foreach ($files as $filePath) {
            if ($this->uploadRecordingToS3($filePath)) {
                $uploadedCount++;
            }

            pcntl_signal_dispatch();
            if ($this->needRestart) {
                break;
            }
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Age-based upload completed: %d files uploaded', $uploadedCount),
            LOG_INFO
        );
    }

    /**
     * Upload single recording file to S3
     *
     * Process:
     * 1. Check if file already uploaded (RecordingStorage mapping exists)
     * 2. Upload to S3 using S3Client
     * 3. Update RecordingStorage mapping
     * 4. Delete local file
     *
     * @param string $localPath Absolute path to recording file
     * @return bool True on success, false on failure
     */
    private function uploadRecordingToS3(string $localPath): bool
    {
        if (!file_exists($localPath)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "File not found: $localPath",
                LOG_WARNING
            );
            return false;
        }

        // Check if already uploaded
        $storageRecord = RecordingStorage::findByPath($localPath);
        if ($storageRecord && $storageRecord->isInS3()) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Already in S3: $localPath",
                LOG_DEBUG
            );
            // Delete local file if it's already in S3
            if (file_exists($localPath)) {
                unlink($localPath);
            }
            return true;
        }

        try {
            // Generate S3 key from local path
            // Example: /monitor/2024/11/01/10/file.wav -> recordings/2024/11/01/10/file.wav
            $s3Key = $this->generateS3Key($localPath);

            // Upload to S3
            $s3Client = new S3Client();

            if (!$s3Client->upload($localPath, $s3Key)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "S3 upload failed: $localPath",
                    LOG_ERR
                );
                return false;
            }

            // Get file size before deletion
            $fileSize = filesize($localPath);

            // Update or create RecordingStorage mapping
            if (!$storageRecord) {
                $storageRecord = new RecordingStorage();
                $storageRecord->recordingfile = $localPath;
            }

            $storageRecord->storage_location = 's3';
            $storageRecord->s3_key = $s3Key;
            $storageRecord->uploaded_at = date('Y-m-d H:i:s');
            $storageRecord->file_size = $fileSize;

            if (!$storageRecord->save()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Failed to save RecordingStorage for %s: %s', $localPath, implode(', ', $storageRecord->getMessages())),
                    LOG_ERR
                );
                return false;
            }

            // Delete local file after successful upload
            if (file_exists($localPath) && !unlink($localPath)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Failed to delete local file: $localPath",
                    LOG_WARNING
                );
                return false;
            }

            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Uploaded to S3: %s -> %s (%.2f MB)', basename($localPath), $s3Key, $fileSize / 1048576),
                LOG_INFO
            );

            return true;

        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Upload error for %s: %s', $localPath, $e->getMessage()),
                LOG_ERR
            );
            return false;
        }
    }

    /**
     * Generate S3 object key from local recording path
     *
     * Preserves directory structure for organization and easy debugging
     *
     * @param string $localPath Local recording path
     * @return string S3 object key
     */
    private function generateS3Key(string $localPath): string
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);

        // Remove monitor directory prefix
        $relativePath = str_replace($monitorDir . '/', '', $localPath);

        // Prepend "recordings/" prefix for S3 organization
        return 'recordings/' . $relativePath;
    }

    /**
     * Find oldest recordings in monitor directory
     *
     * Uses directory structure (YYYY/MM/DD) to scan chronologically from oldest.
     * Returns first N files from oldest directories without scanning the entire tree.
     *
     * @param string $monitorDir Monitor directory path
     * @param int $limit Maximum number of files to return
     * @return array Array of file paths from oldest directories first
     */
    private function findOldestRecordings(string $monitorDir, int $limit): array
    {
        if (!is_dir($monitorDir)) {
            return [];
        }

        $files = [];

        try {
            $years = $this->getSortedSubdirs($monitorDir);

            foreach ($years as $yearDir) {
                if (!ctype_digit(basename($yearDir))) {
                    continue;
                }

                $months = $this->getSortedSubdirs($yearDir);

                foreach ($months as $monthDir) {
                    $days = $this->getSortedSubdirs($monthDir);

                    foreach ($days as $dayDir) {
                        $this->collectAudioFiles($dayDir, $files);

                        if (count($files) >= $limit) {
                            return array_slice($files, 0, $limit);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Error scanning directory: %s', $e->getMessage()),
                LOG_ERR
            );
            return [];
        }

        return array_slice($files, 0, $limit);
    }

    /**
     * Find recordings older than specified timestamp
     *
     * Uses directory structure (YYYY/MM/DD) to scan chronologically from oldest to newest.
     * Stops scanning once it reaches directories newer than expiration time,
     * avoiding full filesystem traversal of tens of thousands of files.
     *
     * @param string $monitorDir Monitor directory path
     * @param int $expirationTime Unix timestamp
     * @param int $limit Maximum number of files to return
     * @return array Array of file paths sorted by directory date (oldest first)
     */
    private function findRecordingsOlderThan(string $monitorDir, int $expirationTime, int $limit): array
    {
        if (!is_dir($monitorDir)) {
            return [];
        }

        $files = [];
        $expirationDate = date('Y/m/d', $expirationTime);

        try {
            // Get year directories sorted ascending
            $years = $this->getSortedSubdirs($monitorDir);

            foreach ($years as $yearDir) {
                $yearName = basename($yearDir);

                // Skip non-year directories (e.g., conversion-tasks)
                if (!ctype_digit($yearName)) {
                    continue;
                }

                // If entire year is newer than expiration, stop
                if ($yearName > substr($expirationDate, 0, 4)) {
                    break;
                }

                // Get month directories sorted ascending
                $months = $this->getSortedSubdirs($yearDir);

                foreach ($months as $monthDir) {
                    $monthName = basename($monthDir);
                    $yearMonth = $yearName . '/' . $monthName;

                    // If this month is newer than expiration, skip remaining months
                    if ($yearMonth > substr($expirationDate, 0, 7)) {
                        break;
                    }

                    // Get day directories sorted ascending
                    $days = $this->getSortedSubdirs($monthDir);

                    foreach ($days as $dayDir) {
                        $dayName = basename($dayDir);
                        $fullDate = $yearMonth . '/' . $dayName;

                        // If this day is newer than expiration, skip remaining days
                        if ($fullDate > $expirationDate) {
                            break;
                        }

                        // Scan hour subdirectories and files within this day
                        $this->collectAudioFiles($dayDir, $files);

                        // Return early once we have enough
                        if (count($files) >= $limit) {
                            return array_slice($files, 0, $limit);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Error scanning directory: %s', $e->getMessage()),
                LOG_ERR
            );
            return [];
        }

        return array_slice($files, 0, $limit);
    }

    /**
     * Get sorted subdirectories of a given path
     *
     * @param string $dir Parent directory
     * @return array Sorted array of subdirectory full paths
     */
    private function getSortedSubdirs(string $dir): array
    {
        $subdirs = [];
        $entries = @scandir($dir, SCANDIR_SORT_ASCENDING);
        if ($entries === false) {
            return [];
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $fullPath = $dir . '/' . $entry;
            if (is_dir($fullPath)) {
                $subdirs[] = $fullPath;
            }
        }

        return $subdirs;
    }

    /**
     * Collect audio files from a directory and its immediate subdirectories (hour dirs)
     *
     * @param string $dir Directory to scan (day-level, may contain hour subdirs)
     * @param array $files Collected files array (passed by reference)
     */
    private function collectAudioFiles(string $dir, array &$files): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && (
                str_ends_with($file->getFilename(), '.wav') ||
                str_ends_with($file->getFilename(), '.mp3') ||
                str_ends_with($file->getFilename(), '.webm')
            )) {
                $files[] = $file->getPathname();
            }
        }
    }
}

// Start the worker
WorkerS3Upload::startWorker($argv ?? []);

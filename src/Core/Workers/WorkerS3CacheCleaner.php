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

use MikoPBX\Common\Models\{PbxSettings, RecordingStorage, StorageSettings};
use MikoPBX\Core\System\{Directories, SystemMessages};
use MikoPBX\Core\System\Storage\S3Client;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Throwable;

require_once 'Globals.php';

/**
 * WorkerS3CacheCleaner - S3 recordings lifecycle manager
 *
 * Two responsibilities:
 * 1. LRU cache eviction for locally cached S3 downloads (max 500MB)
 * 2. Permanent deletion of expired recordings from S3 bucket (PBXRecordSavePeriod)
 *
 * Cache Strategy (LRU):
 * - Sorts files by last access time (atime)
 * - Removes least recently used files first
 * - Maintains cache at 80% of max size for headroom
 *
 * S3 Purge Strategy:
 * - Extracts recording date from file path (YYYY/MM/DD)
 * - Deletes from S3 when age exceeds PBXRecordSavePeriod
 * - Removes RecordingStorage mapping after S3 deletion
 *
 * Execution:
 * - Runs every hour (3600 seconds)
 * - Monitored by WorkerSafeScriptsCore
 * - Graceful shutdown supported
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerS3CacheCleaner extends WorkerBase
{
    /**
     * Maximum cache size in megabytes (500MB)
     * When cache exceeds this size, cleanup is triggered
     */
    private const MAX_CACHE_SIZE_MB = 500;

    /**
     * Target cache size after cleanup (80% of max)
     * Provides headroom before next cleanup needed
     */
    private const TARGET_CACHE_PERCENTAGE = 0.8;

    /**
     * Cleanup interval in seconds (1 hour)
     */
    private const CLEANUP_INTERVAL_SECONDS = 3600;

    /**
     * Batch size for S3 purge operations
     * Prevents excessive memory usage when processing many expired records
     */
    private const PURGE_BATCH_SIZE = 100;

    /**
     * Cache directory path
     * Initialized from Directories class in constructor
     */
    private string $cacheDir;

    /**
     * Get check interval for WorkerSafeScriptsCore monitoring
     *
     * Returns interval in seconds for supervisor to check this worker.
     * Cache cleaner runs every hour, so checking every 30 seconds is sufficient.
     *
     * @return int Check interval in seconds
     */
    public static function getCheckInterval(): int
    {
        return 30; // Check worker status every 30 seconds
    }

    /**
     * Initialize worker
     * Sets up cache directory path from system configuration
     */
    public function __construct()
    {
        parent::__construct();

        // Get cache directory from Directories configuration
        $this->cacheDir = Directories::getDir(Directories::CORE_RECORDINGS_CACHE_DIR);
    }

    /**
     * Main worker loop
     *
     * Runs continuously until shutdown signal received.
     * Performs cache cleanup every hour.
     *
     * @param array $argv Command line arguments (unused)
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

        SystemMessages::sysLogMsg(__CLASS__, 'S3 Cache Cleaner started', LOG_INFO);

        while ($this->needRestart === false) {
            try {
                $this->cleanCache();
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Cache cleanup error: ' . $e->getMessage(),
                    LOG_ERR
                );
            }

            try {
                $this->purgeExpiredS3Recordings();
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'S3 purge error: ' . $e->getMessage(),
                    LOG_ERR
                );
            }

            // Wait 1 hour before next cleanup
            // Check needRestart flag every second for graceful shutdown
            for ($i = 0; $i < self::CLEANUP_INTERVAL_SECONDS && $this->needRestart === false; $i++) {
                sleep(1);
            }
        }

        SystemMessages::sysLogMsg(__CLASS__, 'S3 Cache Cleaner stopped', LOG_INFO);
    }

    /**
     * Perform cache cleanup using LRU strategy
     *
     * Algorithm:
     * 1. Scan cache directory for all files
     * 2. Calculate total cache size
     * 3. If exceeds MAX_CACHE_SIZE_MB:
     *    a. Sort files by last access time (oldest first)
     *    b. Delete files until cache size reaches TARGET (80% of max)
     *
     * Uses atime (last access time) for LRU:
     * - StorageAdapter touches files on access (updates atime)
     * - Frequently accessed files have recent atime
     * - Rarely accessed files have old atime → deleted first
     *
     * @return void
     */
    private function cleanCache(): void
    {
        // Check cache directory exists
        if (!is_dir($this->cacheDir)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Cache directory does not exist: {$this->cacheDir}",
                LOG_WARNING
            );
            return;
        }

        // Collect all cache files with metadata
        $files = $this->collectCacheFiles();

        if (empty($files)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Cache is empty', LOG_DEBUG);
            return;
        }

        // Calculate total cache size
        $totalSize = array_sum(array_column($files, 'size'));
        $totalSizeMB = $totalSize / (1024 * 1024);

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Cache size: %.2f MB (%d files), limit: %d MB',
                $totalSizeMB,
                count($files),
                self::MAX_CACHE_SIZE_MB
            ),
            LOG_INFO
        );

        // Check if cleanup needed
        if ($totalSizeMB <= self::MAX_CACHE_SIZE_MB) {
            SystemMessages::sysLogMsg(__CLASS__, 'Cache size within limit, no cleanup needed', LOG_DEBUG);
            return;
        }

        // Sort by access time (LRU - Least Recently Used first)
        usort($files, fn($a, $b) => $a['atime'] <=> $b['atime']);

        // Calculate target size (80% of max)
        $targetSize = self::MAX_CACHE_SIZE_MB * self::TARGET_CACHE_PERCENTAGE * 1024 * 1024;
        $currentSize = $totalSize;
        $deletedCount = 0;
        $deletedSize = 0;

        // Delete oldest files until target reached
        foreach ($files as $file) {
            if ($currentSize <= $targetSize) {
                break; // Target reached
            }

            if (unlink($file['path'])) {
                $currentSize -= $file['size'];
                $deletedSize += $file['size'];
                $deletedCount++;

                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Deleted from cache: {$file['path']}",
                    LOG_DEBUG
                );
            } else {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Failed to delete: {$file['path']}",
                    LOG_WARNING
                );
            }
        }

        // Log cleanup summary
        $deletedSizeMB = $deletedSize / (1024 * 1024);
        $finalSizeMB = $currentSize / (1024 * 1024);

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Cache cleanup completed: deleted %d files (%.2f MB), final size: %.2f MB',
                $deletedCount,
                $deletedSizeMB,
                $finalSizeMB
            ),
            LOG_INFO
        );

        // Clean up empty subdirectories
        $this->cleanEmptyDirectories();
    }

    /**
     * Collect all cache files with metadata
     *
     * Recursively scans cache directory and returns array of files with:
     * - path: Full file path
     * - size: File size in bytes
     * - atime: Last access timestamp (for LRU sorting)
     *
     * @return array<int, array{path: string, size: int, atime: int}> Array of file metadata
     */
    private function collectCacheFiles(): array
    {
        $files = [];

        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(
                    $this->cacheDir,
                    RecursiveDirectoryIterator::SKIP_DOTS
                )
            );

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $files[] = [
                        'path' => $file->getPathname(),
                        'size' => $file->getSize(),
                        'atime' => $file->getATime(), // Last access time for LRU
                    ];
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'Error scanning cache directory: ' . $e->getMessage(),
                LOG_ERR
            );
        }

        return $files;
    }

    /**
     * Clean up empty subdirectories in cache
     *
     * After deleting files, some subdirectories may become empty.
     * This method removes empty directories to keep cache structure clean.
     *
     * Directory structure: cache/XX/hash_filename.wav
     * Where XX is 2-char hash prefix for sharding
     *
     * @return void
     */
    private function cleanEmptyDirectories(): void
    {
        try {
            // Get all subdirectories (2-char hash prefixes)
            $subdirs = glob($this->cacheDir . '/*', GLOB_ONLYDIR);

            if ($subdirs === false) {
                return;
            }

            foreach ($subdirs as $dir) {
                // Check if directory is empty
                $files = scandir($dir);

                // Directory contains only . and .. entries
                if ($files !== false && count($files) === 2) {
                    if (rmdir($dir)) {
                        SystemMessages::sysLogMsg(
                            __CLASS__,
                            "Removed empty directory: $dir",
                            LOG_DEBUG
                        );
                    }
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'Error cleaning empty directories: ' . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Purge expired recordings from S3 bucket
     *
     * Deletes recordings from S3 when their age exceeds PBXRecordSavePeriod.
     * Recording date is extracted from the file path structure (YYYY/MM/DD).
     * Also removes the corresponding RecordingStorage mapping record.
     *
     * @return void
     */
    private function purgeExpiredS3Recordings(): void
    {
        $savePeriod = (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
        if ($savePeriod <= 0) {
            return; // No expiration configured
        }

        $expirationTime = time() - ($savePeriod * 86400);

        // Find S3 recordings in batches, oldest paths first
        $records = RecordingStorage::find([
            'conditions' => 'storage_location = :location:',
            'bind' => ['location' => 's3'],
            'order' => 'recordingfile ASC',
            'limit' => self::PURGE_BATCH_SIZE,
        ]);

        if ($records->count() === 0) {
            return;
        }

        $s3Client = new S3Client();
        $deletedCount = 0;

        foreach ($records as $record) {
            pcntl_signal_dispatch();
            if ($this->needRestart) {
                break;
            }

            // Extract recording date from file path
            $recordingDate = $this->extractDateFromPath($record->recordingfile);
            if ($recordingDate === null) {
                continue;
            }

            // Skip if not yet expired
            if ($recordingDate >= $expirationTime) {
                continue;
            }

            // Delete from S3 bucket
            if (!$s3Client->delete($record->s3_key)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Failed to delete from S3: %s', $record->s3_key),
                    LOG_ERR
                );
                continue;
            }

            // Remove mapping record
            if (!$record->delete()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf('Failed to delete RecordingStorage record for: %s', $record->recordingfile),
                    LOG_ERR
                );
            }

            $deletedCount++;
        }

        if ($deletedCount > 0) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf('Purged %d expired recordings from S3 (retention: %d days)', $deletedCount, $savePeriod),
                LOG_INFO
            );
        }
    }

    /**
     * Extract recording date from file path
     *
     * Parses the YYYY/MM/DD structure from monitor recording paths.
     * Path format: .../monitor/YYYY/MM/DD/HH/filename.ext
     *
     * @param string $path Recording file path
     * @return int|null Unix timestamp of recording date, or null if unparseable
     */
    private function extractDateFromPath(string $path): ?int
    {
        if (preg_match('#/(\d{4})/(\d{2})/(\d{2})/#', $path, $matches)) {
            $timestamp = mktime(0, 0, 0, (int)$matches[2], (int)$matches[3], (int)$matches[1]);
            return $timestamp ?: null;
        }
        return null;
    }

    /**
     * Get cache statistics
     *
     * Returns current cache state for monitoring and debugging.
     * This method can be called via CLI or REST API for cache inspection.
     *
     * @return array{total_files: int, total_size_mb: float, oldest_file_age_days: float} Cache statistics
     */
    public function getCacheStats(): array
    {
        $files = $this->collectCacheFiles();

        if (empty($files)) {
            return [
                'total_files' => 0,
                'total_size_mb' => 0.0,
                'oldest_file_age_days' => 0.0,
            ];
        }

        $totalSize = array_sum(array_column($files, 'size'));
        $oldestAtime = min(array_column($files, 'atime'));
        $oldestAgeDays = (time() - $oldestAtime) / 86400;

        return [
            'total_files' => count($files),
            'total_size_mb' => round($totalSize / (1024 * 1024), 2),
            'oldest_file_age_days' => round($oldestAgeDays, 2),
        ];
    }
}

// Start worker if executed directly
WorkerS3CacheCleaner::startWorker($argv ?? []);

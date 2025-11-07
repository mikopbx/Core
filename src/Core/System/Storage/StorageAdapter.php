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

namespace MikoPBX\Core\System\Storage;

use MikoPBX\Common\Models\RecordingStorage;
use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Core\System\{Directories, SystemMessages};
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * StorageAdapter - Transparent file access abstraction
 *
 * Provides unified interface for accessing recording files regardless
 * of their storage location (local disk or S3). Implements sequential
 * checking strategy and local caching for S3 files.
 *
 * Sequential Checking Strategy:
 * 1. Check if file exists locally
 * 2. Check RecordingStorage mapping table
 * 3. Check if file exists in cache
 * 4. Download from S3 to cache
 *
 * Cache Management:
 * - LRU (Least Recently Used) eviction
 * - 24-hour TTL for cached files
 * - Directory sharding using 2-char hash prefix
 *
 * Usage:
 * ```php
 * $adapter = new StorageAdapter();
 * $filePath = $adapter->getFile('/monitor/2024/11/01/10/recording.wav');
 * if ($filePath !== null) {
 *     readfile($filePath); // Transparent - could be local or cache
 * }
 * ```
 */
class StorageAdapter
{
    private string $cacheDir;
    private int $cacheTTL = 86400; // 24 hours

    /**
     * Initialize adapter with cache directory
     *
     * @throws \RuntimeException If cache directory cannot be created
     */
    public function __construct()
    {
        // Use Directories class for cache path
        $this->cacheDir = Directories::getDir(Directories::CORE_RECORDINGS_CACHE_DIR);

        // Create cache directory if not exists
        if (!is_dir($this->cacheDir) && !mkdir($this->cacheDir, 0755, true)) {
            throw new \RuntimeException("Failed to create cache directory: {$this->cacheDir}");
        }
    }

    /**
     * Get file path for recording (transparent access)
     *
     * Implements sequential checking strategy:
     * 1. Check local file exists
     * 2. Check RecordingStorage mapping
     * 3. Check cache
     * 4. Download from S3 to cache
     *
     * This method is transparent to callers - they don't need to know
     * if the file is stored locally or in S3. The method handles
     * downloading from S3 automatically when needed.
     *
     * @param string $recordingfile Original recording path from CDR
     * @return string|null Local path to file, or null if not found
     */
    public function getFile(string $recordingfile): ?string
    {
        // ========== STEP 1: CHECK LOCAL FILE ==========
        if (file_exists($recordingfile)) {
            SystemMessages::sysLogMsg(__CLASS__, "Found locally: $recordingfile", LOG_DEBUG);
            return $recordingfile;
        }

        // ========== STEP 2: CHECK RECORDING STORAGE MAPPING ==========
        $storageRecord = RecordingStorage::findByPath($recordingfile);

        if ($storageRecord === null) {
            // No mapping found - file doesn't exist anywhere
            SystemMessages::sysLogMsg(__CLASS__, "Not found: $recordingfile", LOG_WARNING);
            return null;
        }

        // If still local in mapping but file missing - inconsistent state
        if ($storageRecord->storage_location === 'local') {
            SystemMessages::sysLogMsg(__CLASS__, "Mapping says local but file missing: $recordingfile", LOG_ERR);
            return null;
        }

        // ========== STEP 3: CHECK CACHE ==========
        $cachePath = $this->getCachePath($recordingfile);

        if ($this->isCacheValid($cachePath)) {
            SystemMessages::sysLogMsg(__CLASS__, "Found in cache: $recordingfile", LOG_DEBUG);
            touch($cachePath); // Update access time for LRU
            return $cachePath;
        }

        // ========== STEP 4: DOWNLOAD FROM S3 TO CACHE ==========
        try {
            $s3Client = new S3Client();

            if ($s3Client->download($storageRecord->s3_key, $cachePath)) {
                SystemMessages::sysLogMsg(__CLASS__, "Downloaded from S3: $recordingfile", LOG_INFO);
                return $cachePath;
            }

        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "S3 download error: " . $e->getMessage(), LOG_ERR);
        }

        return null;
    }

    /**
     * Get cache file path for recording
     *
     * Uses MD5 hash for unique identification and 2-char prefix
     * for directory sharding to avoid too many files in one directory.
     *
     * Example:
     * Input:  /monitor/2024/11/01/10/out-201-102.wav
     * Hash:   a1b2c3d4e5f6...
     * Output: /cache/a1/a1b2c3d4e5f6_out-201-102.wav
     *
     * @param string $recordingfile Original recording path
     * @return string Cache file path
     */
    private function getCachePath(string $recordingfile): string
    {
        $hash = md5($recordingfile);
        $subdir = substr($hash, 0, 2); // First 2 chars for directory sharding
        $filename = basename($recordingfile);

        $shardDir = "{$this->cacheDir}/{$subdir}";
        if (!is_dir($shardDir) && !mkdir($shardDir, 0755, true)) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to create shard directory: $shardDir", LOG_ERR);
        }

        return "{$shardDir}/{$hash}_{$filename}";
    }

    /**
     * Check if cache file is valid
     *
     * File is valid if:
     * - It exists
     * - Age is less than cacheTTL (24 hours)
     *
     * @param string $cachePath Cache file path
     * @return bool True if cache is valid
     */
    private function isCacheValid(string $cachePath): bool
    {
        if (!file_exists($cachePath)) {
            return false;
        }

        $age = time() - filemtime($cachePath);
        return $age < $this->cacheTTL;
    }

    /**
     * Clear cache for specific recording
     *
     * Removes cached copy of recording file. This is useful when:
     * - Recording was updated in S3
     * - Need to force re-download
     * - Cleanup after deletion
     *
     * @param string $recordingfile Original recording path
     * @return bool True if cache was cleared, false if not found
     */
    public function clearCache(string $recordingfile): bool
    {
        $cachePath = $this->getCachePath($recordingfile);

        if (file_exists($cachePath) && unlink($cachePath)) {
            SystemMessages::sysLogMsg(__CLASS__, "Cache cleared: $recordingfile", LOG_INFO);
            return true;
        }

        return false;
    }

    /**
     * Get cache statistics
     *
     * Provides information about cache usage:
     * - Total number of cached files
     * - Total cache size in bytes
     * - Age of oldest file in seconds
     *
     * Useful for monitoring and diagnostics.
     *
     * @return array{total_files: int, total_size: int, oldest_file_age: int}
     */
    public function getCacheStats(): array
    {
        $totalFiles = 0;
        $totalSize = 0;
        $oldestAge = 0;

        if (!is_dir($this->cacheDir)) {
            return [
                'total_files' => 0,
                'total_size' => 0,
                'oldest_file_age' => 0,
            ];
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->cacheDir, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $totalFiles++;
                $totalSize += $file->getSize();
                $age = time() - $file->getMTime();
                $oldestAge = max($oldestAge, $age);
            }
        }

        return [
            'total_files' => $totalFiles,
            'total_size' => $totalSize,
            'oldest_file_age' => $oldestAge,
        ];
    }

    /**
     * Get file with format fallback support
     *
     * Attempts to find recording file with different audio format extensions.
     * This is useful during migration from MP3/WAV to WebM when files may
     * exist in different formats.
     *
     * Priority order: webm → mp3 → wav
     *
     * Example:
     * Input:  /monitor/2024/11/01/10/out-201-102.mp3
     * Tries:  1. out-201-102.webm (new format)
     *         2. out-201-102.mp3 (specified format)
     *         3. out-201-102.wav (legacy format)
     *
     * @param string $recordingfile Original recording path with extension
     * @return string|null Local path to file, or null if not found in any format
     */
    public function getFileWithFallback(string $recordingfile): ?string
    {
        // Remove existing extension to get base path
        $basePathNoExt = preg_replace('/\.(webm|mp3|wav)$/i', '', $recordingfile);

        // Try extensions in priority order (newest → oldest)
        $extensions = ['webm', 'mp3', 'wav'];

        foreach ($extensions as $ext) {
            $filePath = "{$basePathNoExt}.{$ext}";
            $actualPath = $this->getFile($filePath);

            if ($actualPath !== null) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Format fallback: requested $recordingfile, found $filePath",
                    LOG_DEBUG
                );
                return $actualPath;
            }
        }

        // None of the formats found
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Format fallback failed: no file found for base path $basePathNoExt",
            LOG_WARNING
        );

        return null;
    }

    /**
     * Get cache TTL setting
     *
     * @return int Cache TTL in seconds
     */
    public function getCacheTTL(): int
    {
        return $this->cacheTTL;
    }

    /**
     * Set cache TTL
     *
     * @param int $seconds Cache TTL in seconds
     * @return void
     */
    public function setCacheTTL(int $seconds): void
    {
        $this->cacheTTL = $seconds;
    }

    /**
     * Clean expired cache entries
     *
     * Removes all cached files that are older than cache TTL.
     * This is typically called by WorkerS3CacheCleaner.
     *
     * @return array{deleted: int, freed_bytes: int} Cleanup statistics
     */
    public function cleanExpiredCache(): array
    {
        $deletedCount = 0;
        $freedBytes = 0;

        if (!is_dir($this->cacheDir)) {
            return ['deleted' => 0, 'freed_bytes' => 0];
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->cacheDir, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $age = time() - $file->getMTime();

                if ($age >= $this->cacheTTL) {
                    $size = $file->getSize();
                    if (unlink($file->getPathname())) {
                        $deletedCount++;
                        $freedBytes += $size;
                    }
                }
            }
        }

        if ($deletedCount > 0) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Cleaned expired cache: deleted $deletedCount files, freed " . round($freedBytes / 1024 / 1024, 2) . " MB",
                LOG_INFO
            );
        }

        return [
            'deleted' => $deletedCount,
            'freed_bytes' => $freedBytes,
        ];
    }
}

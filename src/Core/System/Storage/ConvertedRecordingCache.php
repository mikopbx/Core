<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * Keyed cache of call recordings converted to another audio format.
 *
 * Layout: {recordings_cache}/converted/{xx}/{sha1}.{format}, where sha1 is built from
 * the source path, size, mtime and target format. Repeated downloads and every HTTP
 * Range request of the player reuse one conversion instead of running ffmpeg again.
 *
 * WHY a cache instead of per-request temp files: conversion runs in WorkerApiCommands
 * as root while the file is streamed (and was unlinked) by php-fpm as www, which cannot
 * delete root-owned files - every converted file leaked (issue #1268). Files are now
 * removed only by cleanup() in a root worker, by TTL and size limit.
 *
 * cleanup() deletes nothing but regular files whose names match the patterns produced
 * by this class (plus leftovers of the former uniqid() naming in the cache root), and
 * only after realpath() confirms they are inside the cache directory.
 */
class ConvertedRecordingCache
{
    public const string SUBDIR = 'converted';

    /** Converted files untouched for this long are removed (same TTL as StorageAdapter). */
    public const int TTL_SECONDS = 86400;

    /** Size limit of converted files; LRU eviction down to TARGET_SIZE_RATIO of it. */
    public const int MAX_SIZE_BYTES = 500 * 1024 * 1024;

    private const float TARGET_SIZE_RATIO = 0.8;

    /** Abandoned .part / .lock files older than this are removed. */
    private const int STALE_TEMP_SECONDS = 3600;

    /** Converted files used within this period are exempt from LRU eviction. */
    private const int RECENT_USE_SECONDS = 3600;

    /** Target format => ffmpeg muxer. */
    private const array MUXERS = [
        'mp3' => 'mp3',
        'wav' => 'wav',
        'webm' => 'webm',
        'ogg' => 'ogg',
    ];

    private const string FORMATS_REGEX = '(mp3|wav|webm|ogg)';

    private string $cacheDir;

    /**
     * @param string|null $cacheDir Recordings cache root; defaults to CORE_RECORDINGS_CACHE_DIR
     */
    public function __construct(?string $cacheDir = null)
    {
        $this->cacheDir = rtrim(
            $cacheDir ?? Directories::getDir(Directories::CORE_RECORDINGS_CACHE_DIR),
            '/'
        );
    }

    /**
     * Return the source recording converted to the target format, converting on a cache miss.
     *
     * The returned file is shared by concurrent and later requests: callers must not delete it.
     *
     * @param string $sourceFile Path to the source recording
     * @param string $targetFormat Target format (mp3, wav, webm, ogg)
     * @return string|null Path to the converted file, or null on failure
     */
    public function get(string $sourceFile, string $targetFormat): ?string
    {
        $format = strtolower($targetFormat);
        if (!isset(self::MUXERS[$format])) {
            SystemMessages::sysLogMsg(__METHOD__, "Unsupported target format: {$targetFormat}", LOG_WARNING);
            return null;
        }

        $stat = @stat($sourceFile);
        if ($stat === false) {
            return null;
        }

        // Codec parameters in the key: a hit refreshes mtime, so without them a popular entry
        // made with old settings would never expire after the parameters change.
        $key = sha1(implode('|', [$sourceFile, $stat['size'], $stat['mtime'], $format, self::getCodecParameters($format)]));
        $shardDir = $this->getConvertedDir() . '/' . substr($key, 0, 2);
        if (!is_dir($shardDir) && !mkdir($shardDir, 0755, true) && !is_dir($shardDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to create cache directory: {$shardDir}", LOG_ERR);
            return null;
        }

        $cachedFile = "{$shardDir}/{$key}.{$format}";
        if (is_file($cachedFile)) {
            touch($cachedFile);
            return $cachedFile;
        }

        // WHY lock: the player opens a recording with several parallel Range requests;
        // without it each of them would run its own ffmpeg for the same file.
        // The lock file is kept (cleanup() removes it) so waiters never lock a dead inode.
        $lock = fopen("{$shardDir}/{$key}.lock", 'c');
        if ($lock === false) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to open lock file for {$cachedFile}", LOG_ERR);
            return null;
        }

        // Without the lock only duplicate ffmpeg work is possible: part names are per-pid
        $locked = flock($lock, LOCK_EX);
        if (!$locked) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to lock {$cachedFile}, converting unlocked", LOG_WARNING);
        }

        try {
            clearstatcache(true, $cachedFile);
            if (is_file($cachedFile)) {
                touch($cachedFile);
                return $cachedFile;
            }

            // WHY pid in the name: if a lock file is replaced between open and flock,
            // two processes may convert at once; they must not write the same file.
            $partFile = "{$shardDir}/{$key}.{$format}." . getmypid() . '.part';
            if (!$this->convert($sourceFile, $format, $partFile)) {
                @unlink($partFile);
                return null;
            }

            if (!rename($partFile, $cachedFile)) {
                @unlink($partFile);
                SystemMessages::sysLogMsg(__METHOD__, "Failed to move converted file to {$cachedFile}", LOG_ERR);
                return null;
            }

            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'Converted %s to %s: %s (%d bytes) -> %s (%d bytes)',
                    strtoupper(pathinfo($sourceFile, PATHINFO_EXTENSION)),
                    strtoupper($format),
                    basename($sourceFile),
                    $stat['size'],
                    basename($cachedFile),
                    (int)filesize($cachedFile)
                ),
                LOG_INFO
            );

            return $cachedFile;
        } finally {
            if ($locked) {
                flock($lock, LOCK_UN);
            }
            fclose($lock);
        }
    }

    /**
     * Remove expired, excess and abandoned conversion files.
     *
     * @param bool $purgeAll Remove every converted file regardless of age (low disk space)
     * @return array{files: int, bytes: int} What was deleted
     */
    public function cleanup(bool $purgeAll = false): array
    {
        $stats = ['files' => 0, 'bytes' => 0];

        $realCacheDir = realpath($this->cacheDir);
        if ($realCacheDir === false) {
            return $stats;
        }

        $now = time();

        // Leftovers of the former naming: {basename}_{fmt}_{uniqid(more_entropy)}.{fmt},
        // stored directly in the cache root. S3 downloads live only in shard subdirectories.
        $legacyRegex = '/^.+_' . self::FORMATS_REGEX . '_[0-9a-f]{13}\d\.\d{8}\.\1$/';
        foreach ($this->listFiles($realCacheDir, $realCacheDir) as $file) {
            if (preg_match($legacyRegex, $file['name'])) {
                $this->deleteFile($file, $stats);
            }
        }

        $realConvertedDir = realpath($this->getConvertedDir());
        if ($realConvertedDir === false || !str_starts_with($realConvertedDir, $realCacheDir . '/')) {
            return $stats;
        }

        $cachedRegex = '/^[0-9a-f]{40}\.' . self::FORMATS_REGEX . '$/';
        $partRegex = '/^[0-9a-f]{40}\.' . self::FORMATS_REGEX . '\.\d+\.part$/';
        $lockRegex = '/^[0-9a-f]{40}\.lock$/';

        $cached = [];
        $locks = [];
        foreach ($this->listShardDirs($realConvertedDir) as $shardDir) {
            foreach ($this->listFiles($shardDir, $realConvertedDir) as $file) {
                if (preg_match($cachedRegex, $file['name'])) {
                    if ($purgeAll || $now - $file['mtime'] > self::TTL_SECONDS) {
                        $this->deleteFile($file, $stats);
                    } else {
                        $cached[] = $file;
                    }
                } elseif (preg_match($partRegex, $file['name'])) {
                    if ($now - $file['mtime'] > self::STALE_TEMP_SECONDS) {
                        $this->deleteFile($file, $stats);
                    }
                } elseif (preg_match($lockRegex, $file['name'])) {
                    $locks[] = $file;
                }
            }
        }

        // LRU: get() touches files on every hit, so mtime is the last access time.
        // Files used within RECENT_USE_SECONDS are never evicted: they may be streaming now,
        // and a single large conversion must not be re-created on every cleanup pass.
        $totalSize = array_sum(array_column($cached, 'size'));
        if ($totalSize > self::MAX_SIZE_BYTES) {
            usort($cached, static fn(array $a, array $b): int => $a['mtime'] <=> $b['mtime']);
            $targetSize = (int)(self::MAX_SIZE_BYTES * self::TARGET_SIZE_RATIO);
            foreach ($cached as $index => $file) {
                if ($totalSize <= $targetSize || $now - $file['mtime'] <= self::RECENT_USE_SECONDS) {
                    break;
                }
                if ($this->deleteFile($file, $stats)) {
                    $totalSize -= $file['size'];
                    unset($cached[$index]);
                }
            }
        }

        // A lock is removed only together with its cached file, so a lock of an entry in use
        // is never unlinked between another request's fopen() and flock().
        $liveKeys = [];
        foreach ($cached as $file) {
            $liveKeys[strstr($file['name'], '.', true)] = true;
        }
        foreach ($locks as $file) {
            if (
                !isset($liveKeys[strstr($file['name'], '.', true)])
                && $now - $file['mtime'] > self::STALE_TEMP_SECONDS
            ) {
                $this->deleteLockFile($file, $stats);
            }
        }

        return $stats;
    }

    /**
     * Directory holding converted files.
     */
    public function getConvertedDir(): string
    {
        return $this->cacheDir . '/' . self::SUBDIR;
    }

    /**
     * Run ffmpeg and validate the result with ffprobe.
     *
     * @param string $sourceFile Source recording
     * @param string $format Validated target format
     * @param string $outputFile File to write
     * @return bool True if a valid file was written
     */
    private function convert(string $sourceFile, string $format, string $outputFile): bool
    {
        $ffmpeg = Util::which('ffmpeg');
        if (empty($ffmpeg)) {
            SystemMessages::sysLogMsg(__METHOD__, 'ffmpeg not found, cannot convert audio', LOG_WARNING);
            return false;
        }

        $sourceFormat = strtolower(pathinfo($sourceFile, PATHINFO_EXTENSION));

        // OPTIMIZATION: lossless remux for WebM <-> OGG (both use Opus, only the container differs)
        if (self::canUseLosslessRemux($sourceFormat, $format)) {
            $codecParams = '-codec:a copy';
        } else {
            $codecParams = self::getCodecParameters($format);
        }

        // WHY -f: the output name ends with .part, so ffmpeg cannot guess the muxer from it.
        // -vn: audio-only output; -nostdin/-y: never wait for input in a worker process.
        $cmd = sprintf(
            '%s -nostdin -y -i %s -vn %s -f %s %s 2>&1',
            $ffmpeg,
            escapeshellarg($sourceFile),
            $codecParams,
            self::MUXERS[$format],
            escapeshellarg($outputFile)
        );

        $output = [];
        $returnCode = 0;
        exec($cmd, $output, $returnCode);

        if ($returnCode !== 0 || !file_exists($outputFile)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'FFmpeg conversion from %s to %s failed: %s',
                    strtoupper($sourceFormat),
                    strtoupper($format),
                    implode("\n", $output)
                ),
                LOG_ERR
            );
            return false;
        }

        $ffprobe = Util::which('ffprobe');
        if (!empty($ffprobe)) {
            $validateOutput = [];
            $validateCode = 0;
            exec(
                sprintf('%s -v error -show_format %s 2>&1', $ffprobe, escapeshellarg($outputFile)),
                $validateOutput,
                $validateCode
            );

            if ($validateCode !== 0) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf('%s validation failed, file may be corrupted', strtoupper($format)),
                    LOG_WARNING
                );
                return false;
            }
        }

        return true;
    }

    /**
     * Check if lossless remux is possible between two formats
     *
     * @param string $sourceFormat Source format extension
     * @param string $targetFormat Target format extension
     * @return bool True if lossless remux is possible
     */
    private static function canUseLosslessRemux(string $sourceFormat, string $targetFormat): bool
    {
        return ($sourceFormat === 'webm' && $targetFormat === 'ogg')
            || ($sourceFormat === 'ogg' && $targetFormat === 'webm');
    }

    /**
     * Get FFmpeg codec parameters for target format
     *
     * @param string $format Validated target format (mp3, wav, webm, ogg)
     * @return string FFmpeg codec parameters
     */
    private static function getCodecParameters(string $format): string
    {
        return match ($format) {
            // MP3: quick download to listen or forward, so speech grade. The two channels are
            // the two call legs: sum them (an average would make each voice 6 dB quieter),
            // the limiter catches overlapping speech (level=disabled keeps its headroom instead of
            // normalising back to 0 dBFS). 16 kHz covers wideband telephony;
            // compression_level 7 is a faster LAME psychoacoustic pass (#1190: 3x faster).
            'mp3' => '-af ' . escapeshellarg('pan=mono|c0=c0+c1,alimiter=limit=0.95:level=disabled')
                . ' -ar 16000 -codec:a libmp3lame -b:a 32k -compression_level 7',

            // WAV: 16-bit PCM, uncompressed
            'wav' => '-codec:a pcm_s16le',

            // WebM / OGG: Opus codec, 128kbps (Opus is better than Vorbis for speech)
            'webm', 'ogg' => '-codec:a libopus -b:a 128k',
        };
    }

    /**
     * List shard subdirectories ({xx}) of the converted directory, symlinks excluded.
     *
     * @param string $realConvertedDir Resolved converted directory
     * @return array<int, string>
     */
    private function listShardDirs(string $realConvertedDir): array
    {
        $dirs = [];
        foreach (scandir($realConvertedDir) ?: [] as $name) {
            $path = "{$realConvertedDir}/{$name}";
            if (preg_match('/^[0-9a-f]{2}$/', $name) && !is_link($path) && is_dir($path)) {
                $dirs[] = $path;
            }
        }
        return $dirs;
    }

    /**
     * List regular files (not symlinks) of one directory, confined to $allowedRoot.
     *
     * @param string $dir Directory to list (non-recursive)
     * @param string $allowedRoot Resolved directory every returned file must be inside
     * @return array<int, array{path: string, name: string, size: int, mtime: int}>
     */
    private function listFiles(string $dir, string $allowedRoot): array
    {
        $files = [];
        foreach (scandir($dir) ?: [] as $name) {
            $path = "{$dir}/{$name}";
            if (is_link($path) || !is_file($path)) {
                continue;
            }
            $realPath = realpath($path);
            if ($realPath === false || !str_starts_with($realPath, $allowedRoot . '/')) {
                continue;
            }
            $stat = @stat($realPath);
            if ($stat === false) {
                continue;
            }
            $files[] = [
                'path' => $realPath,
                'name' => $name,
                'size' => (int)$stat['size'],
                'mtime' => (int)$stat['mtime'],
            ];
        }
        return $files;
    }

    /**
     * @param array{path: string, name: string, size: int, mtime: int} $file
     * @param array{files: int, bytes: int} $stats
     */
    private function deleteFile(array $file, array &$stats): bool
    {
        if (!@unlink($file['path'])) {
            return false;
        }
        $stats['files']++;
        $stats['bytes'] += $file['size'];
        return true;
    }

    /**
     * Delete a lock file only if no process holds it.
     *
     * @param array{path: string, name: string, size: int, mtime: int} $file
     * @param array{files: int, bytes: int} $stats
     */
    private function deleteLockFile(array $file, array &$stats): void
    {
        $handle = @fopen($file['path'], 'r');
        if ($handle === false) {
            return;
        }
        if (flock($handle, LOCK_EX | LOCK_NB)) {
            $this->deleteFile($file, $stats);
            flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

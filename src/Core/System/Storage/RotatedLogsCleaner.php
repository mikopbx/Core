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

use FilesystemIterator;
use MikoPBX\Core\System\Directories;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Throwable;

/**
 * Frees disk space by deleting old rotated log files.
 *
 * WHY: logs share the storage partition with call recordings. A module whose daemon
 * rotates its own logs without a count limit (name.log.1 ... name.log.61, ~75 MB each)
 * filled the disk, and the low-space cleanup deleted call recordings instead of logs.
 *
 * Rotated files are those named {base}.{N} or {base}.{N}.{gz|bz2|xz|zst} with N of at most
 * MAX_INDEX_DIGITS digits, both the Core logrotate scheme and the one of module daemons;
 * the limit keeps logs named after a PID out. Files of one rotation chain share the
 * directory and {base}.
 *
 * Files modified within MIN_AGE_SECONDS are never deleted: a file still written to is an
 * active log (or one a daemon writes after renaming), and unlinking a file a process keeps
 * open would not free space anyway.
 *
 * Deletion goes in two passes, each one from the chain with the largest volume (the anomaly)
 * to the smallest and from the oldest file to the newest within a chain:
 *  1. files beyond the KEEP_PER_CHAIN newest of their chain;
 *  2. the reserved newest files, only if pass 1 did not free enough: recent log history
 *     is still worth less than call recordings, which are deleted next.
 */
class RotatedLogsCleaner
{
    /** Newest rotated files of every chain kept unless pass 1 did not free enough space. */
    public const int KEEP_PER_CHAIN = 5;

    /** Files modified more recently are never deleted. */
    public const int MIN_AGE_SECONDS = 3600;

    private const int MAX_INDEX_DIGITS = 3;

    private const string ROTATED_REGEX = '/^(.+)\.\d{1,' . self::MAX_INDEX_DIGITS . '}(?:\.(?:gz|bz2|xz|zst))?$/';

    private string $logsDir;

    /**
     * @param string|null $logsDir Logs root; defaults to CORE_LOGS_DIR
     */
    public function __construct(?string $logsDir = null)
    {
        $this->logsDir = rtrim($logsDir ?? Directories::getDir(Directories::CORE_LOGS_DIR), '/');
    }

    /**
     * Delete rotated log files until $missingBytes() reports no shortage.
     *
     * $missingBytes is called once at the start and then only after the files deleted since
     * the previous call add up to the shortage it reported, so a disk filled with many small
     * logs costs a few free-space checks, not one per file.
     *
     * @param callable(): int $missingBytes Bytes still to free, 0 or less when space is enough
     * @return array{files: int, bytes: int, reserved: int, failed: int, chains: array<string, int>}
     *         What was deleted: reserved counts files of pass 2, failed the files that could not
     *         be unlinked; chains maps a chain ({dir}/{base} relative to the logs root) to the
     *         bytes freed in it, largest first
     */
    public function cleanup(callable $missingBytes): array
    {
        $stats = ['files' => 0, 'bytes' => 0, 'reserved' => 0, 'failed' => 0, 'chains' => []];

        $missing = $missingBytes();
        if ($missing <= 0) {
            return $stats;
        }

        $realLogsDir = realpath($this->logsDir);
        if ($realLogsDir === false || !is_dir($realLogsDir)) {
            return $stats;
        }

        $excess = [];
        $reserved = [];
        $maxMtime = time() - self::MIN_AGE_SECONDS;
        foreach ($this->collectChains($realLogsDir) as $chain => $files) {
            // Newest first: a later mtime, or a lower index when files were rotated at once
            usort($files, static fn(array $a, array $b): int => $b['mtime'] <=> $a['mtime']
                ?: strnatcmp($a['name'], $b['name']));
            $old = static fn(array $file): bool => $file['mtime'] <= $maxMtime;
            $chain = substr($chain, strlen($realLogsDir) + 1);
            $excess[$chain] = array_filter(array_slice($files, self::KEEP_PER_CHAIN), $old);
            $reserved[$chain] = array_filter(array_slice($files, 0, self::KEEP_PER_CHAIN), $old);
        }

        $freedSinceCheck = 0;
        foreach ([$excess, $reserved] as $pass => $queue) {
            foreach ($this->orderLargestFirst($queue) as $chain => $files) {
                // Oldest first
                foreach (array_reverse($files) as $file) {
                    if (!@unlink($file['path'])) {
                        $stats['failed']++;
                        continue;
                    }
                    $stats['files']++;
                    $stats['bytes'] += $file['size'];
                    if ($pass === 1) {
                        $stats['reserved']++;
                    }
                    $stats['chains'][$chain] = ($stats['chains'][$chain] ?? 0) + $file['size'];

                    $freedSinceCheck += $file['size'];
                    if ($freedSinceCheck >= $missing) {
                        $missing = $missingBytes();
                        if ($missing <= 0) {
                            break 3;
                        }
                        $freedSinceCheck = 0;
                    }
                }
            }
        }

        arsort($stats['chains']);
        return $stats;
    }

    /**
     * Drop empty chains and sort the rest by their total size, largest first.
     *
     * @param array<string, array<int, array{path: string, name: string, size: int, mtime: int}>> $queue
     * @return array<string, array<int, array{path: string, name: string, size: int, mtime: int}>>
     */
    private function orderLargestFirst(array $queue): array
    {
        $sizes = [];
        foreach ($queue as $chain => $files) {
            if ($files !== []) {
                $sizes[$chain] = array_sum(array_column($files, 'size'));
            }
        }
        arsort($sizes);

        $ordered = [];
        foreach (array_keys($sizes) as $chain) {
            $ordered[$chain] = $queue[$chain];
        }
        return $ordered;
    }

    /**
     * Group rotated log files below the logs root into rotation chains.
     *
     * Symlinks are neither followed nor returned; every file must resolve inside the root.
     *
     * @param string $realLogsDir Resolved logs root
     * @return array<string, array<int, array{path: string, name: string, size: int, mtime: int}>>
     */
    private function collectChains(string $realLogsDir): array
    {
        $chains = [];
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($realLogsDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY,
                RecursiveIteratorIterator::CATCH_GET_CHILD
            );
            foreach ($iterator as $fileInfo) {
                $name = $fileInfo->getFilename();
                if ($fileInfo->isLink() || !$fileInfo->isFile() || !preg_match(self::ROTATED_REGEX, $name, $m)) {
                    continue;
                }
                $realPath = $fileInfo->getRealPath();
                if ($realPath === false || !str_starts_with($realPath, $realLogsDir . '/')) {
                    continue;
                }
                $chains[dirname($realPath) . '/' . $m[1]][] = [
                    'path' => $realPath,
                    'name' => $name,
                    'size' => (int)$fileInfo->getSize(),
                    'mtime' => (int)$fileInfo->getMTime(),
                ];
            }
        } catch (Throwable) {
            // A directory vanished during the scan: work with what was collected
        }
        return $chains;
    }
}

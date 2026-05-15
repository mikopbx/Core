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

namespace MikoPBX\PBXCoreREST\Lib\Storage;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Run Storage I/O Benchmark
 *
 * Sequential write + read benchmark via BusyBox dd.
 *   - write: dd if=/dev/zero of=TMP/.io-benchmark.test bs=1M count=128 conv=fdatasync
 *   - read:  dd if=TMP/.io-benchmark.test of=/dev/null bs=1M iflag=direct
 *
 * conv=fdatasync forces the data to disk before dd reports speed; iflag=direct
 * bypasses the page cache so the read phase measures the medium, not RAM.
 *
 * Result is persisted to TMP/.io-benchmark.json so GetIoBenchmarkAction can
 * return the last measurement without re-running the test.
 */
class RunIoBenchmarkAction
{
    private const BLOCK_SIZE = '1M';
    private const BLOCK_COUNT = 128;
    private const TOTAL_BYTES = 134217728; // 128 MiB
    private const MIN_FREE_BYTES = 268435456; // 256 MiB safety margin
    private const CACHE_FILE_NAME = '.io-benchmark.json';
    private const TEST_FILE_NAME = '.io-benchmark.test';
    private const LOCK_FILE_NAME = '.io-benchmark.lock';

    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $lockHandle = null;
        $lockFile = '';
        $testFile = '';
        try {
            $tempDir = Directories::getDir(Directories::CORE_TEMP_DIR);
            if (!is_dir($tempDir) || !is_writable($tempDir)) {
                $res->messages['error'][] = 'Storage temp directory is not writable: ' . $tempDir;
                $res->success = false;
                return $res;
            }

            $freeBytes = @disk_free_space($tempDir);
            if ($freeBytes === false || $freeBytes < self::MIN_FREE_BYTES) {
                $res->messages['error'][] = sprintf(
                    'Not enough free space for benchmark (need %d bytes, have %s)',
                    self::MIN_FREE_BYTES,
                    $freeBytes === false ? 'unknown' : (string)$freeBytes
                );
                $res->success = false;
                return $res;
            }

            $testFile = $tempDir . '/' . self::TEST_FILE_NAME;
            $cacheFile = $tempDir . '/' . self::CACHE_FILE_NAME;
            $lockFile = $tempDir . '/' . self::LOCK_FILE_NAME;

            // Non-blocking flock — second concurrent caller fails fast instead of
            // racing dd over the same test file.
            $lockHandle = @fopen($lockFile, 'c');
            if ($lockHandle === false || !@flock($lockHandle, LOCK_EX | LOCK_NB)) {
                $res->messages['error'][] = 'Benchmark already running';
                $res->success = false;
                return $res;
            }

            // Util::which('dd') may return either '/bin/dd' or the two-word
            // string '/bin/busybox dd' on images where dd is only a BusyBox
            // applet — must NOT be passed through escapeshellarg() or the
            // shell tries to exec a single binary called "busybox dd".
            $ddPath = Util::which('dd');

            // Clean any stale test file before the write phase.
            @unlink($testFile);

            // LC_ALL=C pins the decimal separator to '.' so parseDdSpeed's
            // regex stays correct even if the image ever switches to GNU dd.
            $writeCmd = sprintf(
                'LC_ALL=C %s if=/dev/zero of=%s bs=%s count=%d conv=fdatasync',
                $ddPath,
                escapeshellarg($testFile),
                self::BLOCK_SIZE,
                self::BLOCK_COUNT
            );
            $writeOut = [];
            $writeRc = 0;
            Processes::mwExec($writeCmd, $writeOut, $writeRc);
            $writeMBps = self::parseDdSpeed(implode("\n", $writeOut));

            $readMBps = null;
            $readRc = 0;
            $readOut = [];
            if ($writeRc === 0 && is_file($testFile)) {
                $readCmd = sprintf(
                    'LC_ALL=C %s if=%s of=/dev/null bs=%s iflag=direct',
                    $ddPath,
                    escapeshellarg($testFile),
                    self::BLOCK_SIZE
                );
                Processes::mwExec($readCmd, $readOut, $readRc);
                $readMBps = self::parseDdSpeed(implode("\n", $readOut));
            }

            @unlink($testFile);

            if ($writeRc !== 0 || $writeMBps === null) {
                $res->messages['error'][] = 'Write benchmark failed (rc=' . $writeRc . ')';
                $res->success = false;
                return $res;
            }
            if ($readRc !== 0 || $readMBps === null) {
                $res->messages['error'][] = 'Read benchmark failed (rc=' . $readRc . ')';
                $res->success = false;
                return $res;
            }

            $result = [
                'writeMBps' => round($writeMBps, 2),
                'readMBps' => round($readMBps, 2),
                'totalBytes' => self::TOTAL_BYTES,
                'blockSize' => self::BLOCK_SIZE,
                'measuredAt' => time(),
                'tool' => 'dd',
            ];
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES));

            $res->data = $result;
            $res->success = true;
            return $res;
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
            return $res;
        } finally {
            if ($lockHandle !== null && $lockHandle !== false) {
                @flock($lockHandle, LOCK_UN);
                @fclose($lockHandle);
            }
            if ($lockFile !== '') {
                @unlink($lockFile);
            }
            if ($testFile !== '') {
                @unlink($testFile);
            }
        }
    }

    /**
     * Parse "...copied, 4.06 s, 16.5 MB/s" tail line emitted by both
     * BusyBox dd and coreutils dd. Returns speed in MB/s (decimal).
     */
    private static function parseDdSpeed(string $output): ?float
    {
        if (preg_match('/copied,\s+[0-9.]+\s+s,\s+([0-9.]+)\s*([KMG]?)B\/s/i', $output, $m)) {
            $value = (float)$m[1];
            $unit = strtoupper($m[2]);
            return match ($unit) {
                'G' => $value * 1024.0,
                'M' => $value,
                'K' => $value / 1024.0,
                '' => $value / 1024.0 / 1024.0,
                default => null,
            };
        }
        return null;
    }
}

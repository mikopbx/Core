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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use DateTime;
use Exception;

/**
 * Parser for extracting timestamps from various log file formats
 *
 * Supports multiple timestamp formats:
 * - Asterisk logs: [2025-10-09 08:21:05]
 * - PHP error logs: [26-Jan-2025 15:59:15 Europe/Moscow]
 * - Fail2ban logs: 2025-10-09 08:25:07,139
 * - System logs: 2025-10-09 08:38:36
 * - Nginx access logs: [2025-10-09T08:38:22+03:00]
 * - Nginx error logs: 2025/10/09 08:25:42
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class LogTimestampParser
{
    /**
     * Timestamp format patterns with their regex and DateTime format
     */
    private const TIMESTAMP_PATTERNS = [
        // Asterisk format: [2025-10-09 08:21:05]
        'asterisk' => [
            'regex' => '/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/',
            'format' => 'Y-m-d H:i:s',
        ],
        // PHP error log format: [26-Jan-2025 15:59:15 Europe/Moscow]
        'php_error' => [
            'regex' => '/^\[(\d{1,2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2}:\d{2})\s+[^\]]+\]/',
            'format' => 'd-M-Y H:i:s',
        ],
        // Fail2ban format: 2025-10-09 08:25:07,139
        'fail2ban' => [
            'regex' => '/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}),\d+/',
            'format' => 'Y-m-d H:i:s',
        ],
        // System logs format: 2025-10-09 08:38:36
        'syslog' => [
            'regex' => '/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/',
            'format' => 'Y-m-d H:i:s',
        ],
        // Nginx access log format: IP - - [2025-10-09T08:38:22+03:00]
        'nginx_iso8601' => [
            'regex' => '/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})\]/',
            'format' => 'Y-m-d\TH:i:sP',
        ],
        // Nginx error log format: 2025/10/09 08:25:42
        'nginx_error' => [
            'regex' => '/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/',
            'format' => 'Y/m/d H:i:s',
        ],
    ];

    /**
     * Parse timestamp from log line
     *
     * @param string $line Log line
     * @return int|null Unix timestamp or null if parsing failed
     */
    public static function parseTimestamp(string $line): ?int
    {
        foreach (self::TIMESTAMP_PATTERNS as $pattern) {
            if (preg_match($pattern['regex'], $line, $matches)) {
                try {
                    $dateString = $matches[1];
                    $dateTime = DateTime::createFromFormat($pattern['format'], $dateString);

                    if ($dateTime !== false) {
                        return $dateTime->getTimestamp();
                    }
                } catch (Exception $e) {
                    // Continue to next pattern
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * Extract time range from log file
     *
     * @param string $filename Full path to log file
     * @return array{start: int|null, end: int|null, start_formatted: string, end_formatted: string, total_lines: int}
     */
    public static function getLogTimeRange(string $filename): array
    {
        $result = [
            'start' => null,
            'end' => null,
            'start_formatted' => '',
            'end_formatted' => '',
            'total_lines' => 0,
        ];

        if (!file_exists($filename) || !is_readable($filename)) {
            return $result;
        }

        // Get first timestamp
        $firstTimestamp = self::getFirstTimestamp($filename);

        // Get last timestamp
        $lastTimestamp = self::getLastTimestamp($filename);

        // Count total lines
        $totalLines = self::countLines($filename);

        if ($firstTimestamp !== null) {
            $result['start'] = $firstTimestamp;
            $result['start_formatted'] = date('Y-m-d H:i:s', $firstTimestamp);
        }

        if ($lastTimestamp !== null) {
            $result['end'] = $lastTimestamp;
            $result['end_formatted'] = date('Y-m-d H:i:s', $lastTimestamp);
        }

        $result['total_lines'] = $totalLines;

        return $result;
    }

    /**
     * Get first timestamp from file
     *
     * @param string $filename Full path to log file
     * @return int|null Unix timestamp or null
     */
    private static function getFirstTimestamp(string $filename): ?int
    {
        // Check if file is gzipped
        $isGzipped = str_ends_with($filename, '.gz');
        $handle = $isGzipped ? gzopen($filename, 'r') : fopen($filename, 'r');

        if ($handle === false) {
            return null;
        }

        $timestamp = null;
        $maxLines = 100; // Check first 100 lines max
        $lineCount = 0;

        while (($line = $isGzipped ? gzgets($handle) : fgets($handle)) !== false && $lineCount < $maxLines) {
            $lineCount++;
            $timestamp = self::parseTimestamp($line);
            if ($timestamp !== null) {
                break;
            }
        }

        $isGzipped ? gzclose($handle) : fclose($handle);
        return $timestamp;
    }

    /**
     * Get last timestamp from file
     *
     * @param string $filename Full path to log file
     * @return int|null Unix timestamp or null
     */
    private static function getLastTimestamp(string $filename): ?int
    {
        $maxLines = 100; // Check last 100 lines max

        // Check if file is gzipped
        $isGzipped = str_ends_with($filename, '.gz');

        // For gzipped files, read all lines since seeking backward is not efficient
        if ($isGzipped) {
            $lines = self::readAllLinesGzipped($filename, $maxLines);
        } else {
            $lines = self::readLastLines($filename, $maxLines);
        }

        // Parse from last to first
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $timestamp = self::parseTimestamp($lines[$i]);
            if ($timestamp !== null) {
                return $timestamp;
            }
        }

        return null;
    }

    /**
     * Maximum buffered chunk size for backward reading.
     * Files without newlines (binary, single-line JSON, corrupted logs) would otherwise
     * grow $chunk unbounded and OOM the worker. 1 MiB is far above any plausible log line.
     */
    private const READ_LAST_LINES_MAX_BUFFER = 1048576;

    /**
     * Files at or below this size are read whole instead of doing backward chunk seeks —
     * simpler, faster, and avoids the entire failure mode of the seeking algorithm.
     */
    private const READ_LAST_LINES_SMALL_FILE_THRESHOLD = 65536;

    /**
     * Read last N lines from file efficiently
     *
     * @param string $filename Full path to log file
     * @param int $lines Number of lines to read
     * @return array<int, string> Array of lines
     */
    private static function readLastLines(string $filename, int $lines): array
    {
        $size = @filesize($filename);
        if ($size === false || $size === 0 || $lines <= 0) {
            return [];
        }

        // Small file: just read it whole. file() handles trailing newlines correctly
        // and avoids the backward-seek state machine entirely.
        if ($size <= self::READ_LAST_LINES_SMALL_FILE_THRESHOLD) {
            $allLines = @file($filename, FILE_IGNORE_NEW_LINES);
            if ($allLines === false) {
                return [];
            }
            return array_slice($allLines, -$lines);
        }

        $handle = @fopen($filename, 'rb');
        if ($handle === false) {
            return [];
        }

        // If the file ends with '\n', virtually clip it so that explode() won't produce
        // a spurious empty trailing element that would consume one of the requested slots.
        // Matches file()/FILE_IGNORE_NEW_LINES semantics for normal log files.
        fseek($handle, -1, SEEK_END);
        if (fread($handle, 1) === "\n") {
            $size--;
        }

        $output = [];
        $chunk = '';
        $pos = $size;
        $bufferSize = 4096;

        while ($pos > 0 && count($output) < $lines) {
            // Bail out on files without newlines (binary data, single huge JSON, etc.)
            // before $chunk grows large enough to exhaust memory_limit. See issue #1021.
            if (strlen($chunk) > self::READ_LAST_LINES_MAX_BUFFER) {
                break;
            }

            $readSize = (int)min($pos, $bufferSize);
            $pos -= $readSize;
            if (fseek($handle, $pos, SEEK_SET) !== 0) {
                break;
            }
            $data = fread($handle, $readSize);
            if ($data === false) {
                break;
            }

            $chunk = $data . $chunk;
            $linesArray = explode("\n", $chunk);
            // First element may be a partial line whose start lives in the not-yet-read part
            // of the file. Stash it for the next iteration; the rest are complete lines.
            $chunk = array_shift($linesArray);
            $output = array_merge($linesArray, $output);
        }

        // Reached the start of the file: $chunk now holds the very first line.
        if ($pos === 0 && $chunk !== '') {
            array_unshift($output, $chunk);
        }

        fclose($handle);

        if (count($output) > $lines) {
            $output = array_slice($output, -$lines);
        }

        return $output;
    }

    /**
     * Read all lines from gzipped file, keeping only last N lines
     *
     * @param string $filename Full path to gzipped log file
     * @param int $maxLines Maximum number of lines to keep
     * @return array<int, string> Array of last lines
     */
    private static function readAllLinesGzipped(string $filename, int $maxLines): array
    {
        $handle = gzopen($filename, 'r');
        if ($handle === false) {
            return [];
        }

        $lines = [];
        while (($line = gzgets($handle)) !== false) {
            $lines[] = $line;
            // Keep only last N lines to avoid memory issues
            if (count($lines) > $maxLines) {
                array_shift($lines);
            }
        }

        gzclose($handle);
        return $lines;
    }

    /**
     * Count total lines in file
     *
     * @param string $filename Full path to log file
     * @return int Number of lines
     */
    private static function countLines(string $filename): int
    {
        // Check if file is gzipped
        $isGzipped = str_ends_with($filename, '.gz');
        $handle = $isGzipped ? gzopen($filename, 'r') : fopen($filename, 'r');

        if ($handle === false) {
            return 0;
        }

        $lines = 0;
        while (!feof($handle)) {
            $line = $isGzipped ? gzgets($handle) : fgets($handle);
            if ($line !== false) {
                $lines++;
            }
        }

        $isGzipped ? gzclose($handle) : fclose($handle);
        return $lines;
    }
}

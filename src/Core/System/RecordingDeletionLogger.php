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

namespace MikoPBX\Core\System;

/**
 * RecordingDeletionLogger - Unified audit log for all recording file deletions
 *
 * Writes to a dedicated log file so that every deletion of a recording file
 * can be traced back to the specific mechanism that removed it.
 *
 * Log format: [YYYY-MM-DD HH:MM:SS] REASON | path | details
 *
 * Usage:
 *   RecordingDeletionLogger::log(RecordingDeletionLogger::DISK_CLEANUP, '/path/to/file.wav', 'free_space=120MB');
 *
 * @package MikoPBX\Core\System
 */
class RecordingDeletionLogger
{
    /** Disk space cleanup by WorkerRemoveOldRecords (rm -rf oldest directories) */
    public const string DISK_CLEANUP = 'DISK_CLEANUP';

    /** API DELETE request from user */
    public const string API_DELETE = 'API_DELETE';

    /** Local file deleted after successful S3 upload */
    public const string S3_UPLOADED = 'S3_UPLOADED';

    /** Recording permanently deleted from S3 bucket (retention expired) */
    public const string S3_PURGED = 'S3_PURGED';

    /** Local S3 cache file evicted by LRU cleanup */
    public const string S3_CACHE_EVICT = 'S3_CACHE_EVICT';

    /** Source WAV files deleted after successful WebM conversion */
    public const string CONVERSION_CLEANUP = 'CONVERSION_CLEANUP';

    /** Empty source files deleted (no audio data, only WAV header) */
    public const string CONVERSION_EMPTY = 'CONVERSION_EMPTY';

    /** CDR records deleted by retention policy (removes recordings from UI) */
    public const string CDR_RETENTION = 'CDR_RETENTION';

    /** Log file name */
    private const string LOG_FILENAME = 'recording_deletions.log';

    /**
     * Write a deletion event to the recording deletions log
     *
     * @param string $reason One of the class constants (DISK_CLEANUP, API_DELETE, etc.)
     * @param string $path File or directory path being deleted
     * @param string $details Additional context (free space, S3 key, user info, etc.)
     */
    public static function log(string $reason, string $path, string $details = ''): void
    {
        $logFile = self::getLogFilePath();
        if ($logFile === '') {
            return;
        }

        $timestamp = date('Y-m-d H:i:s');
        $line = "[$timestamp] $reason | $path";
        if ($details !== '') {
            $line .= " | $details";
        }
        $line .= PHP_EOL;

        @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
    }

    /**
     * Get the full path to the recording deletions log file
     *
     * @return string Log file path, or empty string if directory unavailable
     */
    public static function getLogFilePath(): string
    {
        $logsDir = Directories::getDir(Directories::CORE_LOGS_DIR);
        if (empty($logsDir)) {
            return '';
        }

        $systemLogDir = $logsDir . '/system';
        if (!is_dir($systemLogDir)) {
            Util::mwMkdir($systemLogDir);
        }

        return $systemLogDir . '/' . self::LOG_FILENAME;
    }
}

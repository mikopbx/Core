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

namespace MikoPBX\Core\System\ConsoleMenu\Utilities;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Util;

/**
 * Log file viewer utility
 *
 * Provides two modes for viewing log files:
 * - Realtime: using tail -f for continuous monitoring
 * - From end: using less for browsing (BusyBox compatible)
 */
class LogViewer
{
    /**
     * Log file paths relative to logs directory
     */
    private const array LOG_PATHS = [
        'system' => 'system/messages',
        'asterisk' => 'asterisk/messages',
        'php' => 'php/error.log',
        'nginx' => 'nginx/error.log',
        'fail2ban' => 'fail2ban/fail2ban.log',
    ];

    private string $logsDir;

    public function __construct()
    {
        $this->logsDir = Directories::getDir(Directories::CORE_LOGS_DIR);
    }

    /**
     * View log file in realtime mode using vi
     *
     * @param string $logType Log type (system, asterisk, php, nginx, fail2ban)
     * @return bool True if log was viewed successfully
     */
    public function viewRealtime(string $logType): bool
    {
        // Use same vi viewer for all modes (BusyBox compatible)
        return $this->viewFromEnd($logType);
    }

    /**
     * View log file in read-only mode using vi
     *
     * Uses vi -R for reliable terminal handling in BusyBox environment.
     * Navigate with arrow keys or j/k, press :q to exit.
     *
     * @param string $logType Log type (system, asterisk, php, nginx, fail2ban)
     * @return bool True if log was viewed successfully
     */
    public function viewFromEnd(string $logType): bool
    {
        $logFile = $this->getLogFilePath($logType);
        if ($logFile === null || !file_exists($logFile)) {
            return false;
        }

        $viPath = Util::which('vi');
        if (empty($viPath)) {
            echo "vi command not found\n";
            return false;
        }

        // Reset terminal to sane state before running vi (required after CliMenu closes)
        passthru('stty sane 2>/dev/null');

        // Run vi in read-only mode (press G to go to end of file)
        passthru("$viPath -R " . escapeshellarg($logFile));

        return true;
    }

    /**
     * View log file with custom line count (last N lines)
     *
     * @param string $logType Log type
     * @param int $lines Number of lines to show
     * @return bool True if log was viewed successfully
     */
    public function viewLastLines(string $logType, int $lines = 100): bool
    {
        $logFile = $this->getLogFilePath($logType);
        if ($logFile === null || !file_exists($logFile)) {
            return false;
        }

        $tailPath = Util::which('tail');
        if (empty($tailPath)) {
            echo "tail command not found\n";
            return false;
        }

        echo "\n=== Last $lines lines of: $logFile ===\n\n";
        passthru("$tailPath -n $lines " . escapeshellarg($logFile));

        return true;
    }

    /**
     * Get full path to log file
     *
     * @param string $logType Log type identifier
     * @return string|null Full path or null if unknown log type
     */
    public function getLogFilePath(string $logType): ?string
    {
        if (!isset(self::LOG_PATHS[$logType])) {
            return null;
        }

        return $this->logsDir . '/' . self::LOG_PATHS[$logType];
    }

    /**
     * Get list of available log types
     *
     * @return array Array of available log types with their descriptions
     */
    public function getAvailableLogTypes(): array
    {
        $available = [];
        foreach (self::LOG_PATHS as $type => $relativePath) {
            $fullPath = $this->logsDir . '/' . $relativePath;
            if (file_exists($fullPath)) {
                $size = filesize($fullPath);
                $available[$type] = [
                    'path' => $fullPath,
                    'relative' => $relativePath,
                    'size' => $this->formatFileSize($size),
                    'exists' => true,
                ];
            } else {
                $available[$type] = [
                    'path' => $fullPath,
                    'relative' => $relativePath,
                    'size' => '0 KB',
                    'exists' => false,
                ];
            }
        }
        return $available;
    }

    /**
     * Format file size for display
     *
     * @param int $bytes File size in bytes
     * @return string Formatted size (e.g., "1.5 MB")
     */
    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $index = 0;
        $size = $bytes;

        while ($size >= 1024 && $index < count($units) - 1) {
            $size /= 1024;
            $index++;
        }

        return round($size, 1) . ' ' . $units[$index];
    }
}

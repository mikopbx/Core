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

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Injectable;

/**
 * Gets the available time range for a log file
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class GetLogTimeRangeAction extends Injectable
{
    /**
     * Gets the available time range for a log file
     *
     * Uses Single Source of Truth pattern - sanitization rules from DataStructure.
     *
     * @param array<string, mixed> $data An array containing the following parameters:
     *                    - filename (string): The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // WHY: Get sanitization rules from DataStructure (Single Source of Truth)
        // DataStructure defines all field constraints, not controller attributes
        $sanitizationRules = DataStructure::getSanitizationRules();

        // WHY: Sanitize input data for security - never trust user input
        $sanitizedData = BaseActionHelper::sanitizeData($data, $sanitizationRules);

        // Extract validated parameters
        $filename = (string)($sanitizedData['filename'] ?? '');

        // WHY: Validate filename is not empty before constructing path
        if (empty($filename)) {
            $res->success = false;
            $res->messages['error'][] = 'Filename parameter is required and cannot be empty';
            $res->httpCode = 400;
            return $res;
        }

        $fullPath = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;

        // Security: path traversal protection
        $realLogDir = realpath(Directories::getDir(Directories::CORE_LOGS_DIR));
        $realFullPath = realpath($fullPath);
        if ($realFullPath === false || $realLogDir === false
            || !str_starts_with($realFullPath . '/', $realLogDir . '/')) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_invalid_path');
            $res->httpCode = 400;
            return $res;
        }
        $fullPath = $realFullPath;

        // WHY: Check file_exists first, then is_file to prevent directory access
        // file_exists returns true for directories, which causes fopen/fgets errors
        if (!file_exists($fullPath)) {
            $res->success = false;
            $res->messages[] = 'Log file not found: ' . $filename;
            return $res;
        }

        if (!is_file($fullPath)) {
            $res->success = false;
            $res->messages[] = 'Path is not a file: ' . $filename;
            return $res;
        }

        if (!is_readable($fullPath)) {
            $res->success = false;
            $res->messages[] = 'No read access to the file: ' . $filename;
            return $res;
        }

        // Get time range using LogTimestampParser
        $timeRange = LogTimestampParser::getLogTimeRange($fullPath);

        $res->success = true;
        $res->data = [
            'filename' => $filename,
            'time_range' => [
                'start' => $timeRange['start'],
                'end' => $timeRange['end'],
                'start_formatted' => $timeRange['start_formatted'],
                'end_formatted' => $timeRange['end_formatted'],
            ],
            'total_lines' => $timeRange['total_lines'],
            'server_timezone_offset' => (new \DateTime())->getOffset(), // Server timezone offset in seconds
        ];

        return $res;
    }
}

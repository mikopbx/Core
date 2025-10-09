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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\SysLogs\DownloadLogFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\DownloadLogsArchiveAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\EraseFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\GetLogFromFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\GetLogTimeRangeAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\GetLogsListAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\PrepareLogAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\StartLogAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for syslog management
 */
enum SyslogAction: string
{
    // Custom methods for log operations
    case GET_LOGS_LIST = 'getLogsList';
    case GET_LOG_FROM_FILE = 'getLogFromFile';
    case GET_LOG_TIME_RANGE = 'getLogTimeRange';
    case START_CAPTURE = 'startCapture';
    case STOP_CAPTURE = 'stopCapture';
    case PREPARE_ARCHIVE = 'prepareArchive';
    case DOWNLOAD_LOG_FILE = 'downloadLogFile';
    case DOWNLOAD_ARCHIVE = 'downloadArchive';
    case ERASE_FILE = 'eraseFile';
}

/**
 * Class SysLogsManagementProcessor
 *
 * Processes system logs management requests including capture, archive, and download
 *
 * Custom methods:
 * - GET  /syslog:getLogsList      -> Get list of available log files
 * - POST /syslog:getLogFromFile   -> Get content from specific log file
 * - POST /syslog:getLogTimeRange  -> Get available time range for specific log file
 * - POST /syslog:startCapture     -> Start log capture with tcpdump
 * - POST /syslog:stopCapture      -> Stop capture and prepare archive
 * - POST /syslog:prepareArchive   -> Prepare logs archive without stopping capture
 * - POST /syslog:downloadLogFile  -> Download specific log file
 * - POST /syslog:downloadArchive  -> Download prepared logs archive
 * - POST /syslog:eraseFile        -> Erase log file content
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class SysLogsManagementProcessor extends Injectable
{
    /**
     * Processes syslog management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionValue = $request['action'] ?? '';
        $actionString = is_string($actionValue) ? $actionValue : '';

        $dataValue = $request['data'] ?? [];
        /** @var array<string, mixed> $data */
        $data = is_array($dataValue) ? $dataValue : [];

        // Type-safe action matching with enum
        $action = SyslogAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        // All actions now use unified parameter validation with ParameterSanitizationExtractor
        $res = match ($action) {
            SyslogAction::GET_LOGS_LIST => GetLogsListAction::main(),
            SyslogAction::GET_LOG_FROM_FILE => GetLogFromFileAction::main($data),
            SyslogAction::GET_LOG_TIME_RANGE => GetLogTimeRangeAction::main($data),
            SyslogAction::START_CAPTURE => StartLogAction::main(),
            SyslogAction::STOP_CAPTURE => PrepareLogAction::main(true),
            SyslogAction::PREPARE_ARCHIVE => PrepareLogAction::main(false),
            SyslogAction::DOWNLOAD_LOG_FILE => DownloadLogFileAction::main($data),
            SyslogAction::DOWNLOAD_ARCHIVE => DownloadLogsArchiveAction::main($data),
            SyslogAction::ERASE_FILE => EraseFileAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}
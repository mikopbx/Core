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

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SysLogsManagementProcessor;

/**
 * RESTful controller for system logs management (v3 API)
 *
 * Handles log file operations, capture, and archive management following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/syslog")
 *
 * @examples Standard operations:
 *
 * # List all available log files
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/syslog:getLogsList"
 *
 * # Get content from a specific log file
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:getLogFromFile \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"asterisk/messages","filter":"","lines":"500"}'
 *
 * # Start log capture with tcpdump
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:startCapture
 *
 * # Stop capture and prepare archive
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:stopCapture
 *
 * # Prepare logs archive without stopping capture
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:prepareArchive
 *
 * # Download specific log file
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:downloadLogFile \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"asterisk/messages"}'
 *
 * # Download prepared logs archive
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:downloadArchive \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"/tmp/logs.zip"}'
 *
 * # Erase log file content
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/syslog:eraseFile \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"asterisk/messages"}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Syslog
 */
class RestController extends BaseRestController
{
    protected string $processorClass = SysLogsManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => [
                'getLogsList'
            ],
            'POST' => [
                'getLogFromFile',
                'startCapture',
                'stopCapture',
                'prepareArchive',
                'downloadLogFile',
                'downloadArchive',
                'eraseFile'
            ]
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     * Overridden because syslog methods are mostly collection-level
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        // None of the syslog custom methods require a resource ID
        // They all operate at the collection level
        return false;
    }
}
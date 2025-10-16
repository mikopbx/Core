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
use MikoPBX\PBXCoreREST\Lib\SysLogs\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for system logs management (v3 API)
 *
 * Comprehensive log management including viewing, downloading, archiving and capturing.
 * Provides access to system logs (Asterisk, PHP, system), network capture with tcpdump,
 * and archive generation for troubleshooting and diagnostics.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Syslog
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/syslog',
    tags: ['System Logs', 'Diagnostics'],
    description: 'System logs management and diagnostics tools. ' .
                'Provides access to system logs, log filtering, network packet capture, and archive generation. ' .
                'Essential for troubleshooting and system monitoring.',
    processor: SysLogsManagementProcessor::class
)]
#[ResourceSecurity('syslog', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getLogsList'],
        'POST' => ['getLogFromFile', 'getLogTimeRange', 'startCapture', 'stopCapture', 'prepareArchive', 'downloadLogFile', 'downloadArchive', 'eraseFile']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['getLogsList', 'getLogFromFile', 'getLogTimeRange', 'startCapture', 'stopCapture', 'prepareArchive', 'downloadLogFile', 'downloadArchive', 'eraseFile'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SysLogsManagementProcessor::class;

    /**
     * Get list of available log files
     *
     * @route GET /pbxcore/api/v3/syslog:getLogsList
     */
    #[ApiOperation(
        summary: 'rest_syslog_GetLogsList',
        description: 'rest_syslog_GetLogsListDesc',
        operationId: 'getSystemLogsList'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getLogsList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get content from specific log file
     *
     * @route POST /pbxcore/api/v3/syslog:getLogFromFile
     */
    #[ApiOperation(
        summary: 'rest_syslog_GetLogFromFile',
        description: 'rest_syslog_GetLogFromFileDesc',
        operationId: 'getLogContent'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiParameterRef('filter')]
    #[ApiParameterRef('logLevel')]
    #[ApiParameterRef('lines')]
    #[ApiParameterRef('offset')]
    #[ApiParameterRef('dateFrom')]
    #[ApiParameterRef('dateTo')]
    #[ApiResponse(200, 'rest_response_200_log_content')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getLogFromFile(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get available time range for specific log file
     *
     * @route POST /pbxcore/api/v3/syslog:getLogTimeRange
     */
    #[ApiOperation(
        summary: 'rest_syslog_GetLogTimeRange',
        description: 'rest_syslog_GetLogTimeRangeDesc',
        operationId: 'getLogTimeRange'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiResponse(200, 'rest_response_200_log_time_range')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getLogTimeRange(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Start network packet capture with tcpdump
     *
     * @route POST /pbxcore/api/v3/syslog:startCapture
     */
    #[ApiOperation(
        summary: 'rest_syslog_StartCapture',
        description: 'rest_syslog_StartCaptureDesc',
        operationId: 'startPacketCapture'
    )]
    #[ApiResponse(200, 'rest_response_200_started')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function startCapture(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Stop network packet capture
     *
     * @route POST /pbxcore/api/v3/syslog:stopCapture
     */
    #[ApiOperation(
        summary: 'rest_syslog_StopCapture',
        description: 'rest_syslog_StopCaptureDesc',
        operationId: 'stopPacketCapture'
    )]
    #[ApiResponse(200, 'rest_response_200_stopped')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function stopCapture(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Prepare logs archive for download
     *
     * @route POST /pbxcore/api/v3/syslog:prepareArchive
     */
    #[ApiOperation(
        summary: 'rest_syslog_PrepareArchive',
        description: 'rest_syslog_PrepareArchiveDesc',
        operationId: 'prepareLogsArchive'
    )]
    #[ApiResponse(200, 'rest_response_200_archive_prepared')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function prepareArchive(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Download specific log file
     *
     * @route POST /pbxcore/api/v3/syslog:downloadLogFile
     */
    #[ApiOperation(
        summary: 'rest_syslog_DownloadLogFile',
        description: 'rest_syslog_DownloadLogFileDesc',
        operationId: 'downloadLogFile'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiParameterRef('archive')]
    #[ApiResponse(200, 'rest_response_200_file_download')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function downloadLogFile(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Download prepared logs archive
     *
     * @route POST /pbxcore/api/v3/syslog:downloadArchive
     */
    #[ApiOperation(
        summary: 'rest_syslog_DownloadArchive',
        description: 'rest_syslog_DownloadArchiveDesc',
        operationId: 'downloadLogsArchive'
    )]
    #[ApiParameterRef('filename', required: true, example: '/tmp/logs.zip')]
    #[ApiResponse(200, 'rest_response_200_file_download')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function downloadArchive(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Erase log file content
     *
     * @route POST /pbxcore/api/v3/syslog:eraseFile
     */
    #[ApiOperation(
        summary: 'rest_syslog_EraseFile',
        description: 'rest_syslog_EraseFileDesc',
        operationId: 'eraseLogFile'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function eraseFile(): void
    {
        // Implementation handled by BaseRestController
    }
}
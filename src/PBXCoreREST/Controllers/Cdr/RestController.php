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

namespace MikoPBX\PBXCoreREST\Controllers\Cdr;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CdrManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Cdr\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for CDR (Call Detail Records) management (v3 API)
 *
 * Comprehensive CDR management following Google API Design Guide patterns.
 * Implements read-only access to call history, active calls monitoring, and call recording playback.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Cdr
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/cdr',
    tags: ['Call Records'],
    description: 'rest_Cdr_ApiDescription',
    processor: CdrManagementProcessor::class
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getMetadata', 'getStatsByProvider', 'playback', 'download'],
        'DELETE' => ['delete'],
        'HEAD' => ['playback']
    ],
    resourceLevelMethods: ['getRecord', 'delete'],
    collectionLevelMethods: ['getList', 'getMetadata', 'getStatsByProvider', 'playback', 'download'],
    customMethods: ['getMetadata', 'getStatsByProvider', 'playback', 'download'],
    // WHY: idPattern accepts both numeric ID and linkedid for routing flexibility
    // Array of prefixes: each prefix + [^/:]+
    // '' generates [^/:]+  (matches numeric ID like "718517")
    // 'mikopbx-' generates mikopbx-[^/:]+  (matches linkedid like "mikopbx-1760784793.4627")
    //
    // IMPORTANT: Individual methods further restrict ID format via ApiParameterRef pattern:
    // - getRecord, playback, download: numeric only (pattern: '^[0-9]+$')
    // - delete: numeric OR linkedid (pattern: '^([0-9]+|mikopbx-.+)$')
    //
    // SECURITY NOTE: ResourceSecurity removed from class level because this resource has mixed security:
    // - getList/getRecord/delete: require Bearer token (added at method level)
    // - playback/download: public with token-based access (SecurityType::PUBLIC)
    idPattern: ['', 'mikopbx-']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = CdrManagementProcessor::class;


    /**
     * Get list of CDR records with filtering and pagination
     *
     * @route GET /pbxcore/api/v3/cdr
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_cdr_GetList',
        description: 'rest_cdr_GetListDesc',
        operationId: 'getCdrList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('dateFrom')]
    #[ApiParameterRef('dateTo')]
    #[ApiParameterRef('src_num')]
    #[ApiParameterRef('dst_num')]
    #[ApiParameterRef('disposition')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific CDR record by ID
     *
     * @route GET /pbxcore/api/v3/cdr/{id}
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cdr_GetRecord',
        description: 'rest_cdr_GetRecordDesc',
        operationId: 'getCdrById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '12345')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get CDR metadata (date range from recent records)
     *
     * Returns lightweight metadata about CDR records without fetching full data.
     * Used for initializing UI with meaningful date range.
     *
     * @route GET /pbxcore/api/v3/cdr:getMetadata
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    #[ApiOperation(
        summary: 'rest_cdr_GetMetadata',
        description: 'rest_cdr_GetMetadataDesc',
        operationId: 'getCdrMetadata'
    )]
    #[ApiParameterRef('limit', required: false)]
    #[ApiResponse(200, 'rest_response_200_metadata')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getMetadata(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get aggregated CDR statistics grouped by provider/trunk
     *
     * Returns call counts and duration totals per trunk, split by direction
     * (incoming/outgoing). Useful for monitoring, dashboards, and reporting.
     *
     * @route GET /pbxcore/api/v3/cdr:getStatsByProvider
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    #[ApiOperation(
        summary: 'rest_cdr_GetStatsByProvider',
        description: 'rest_cdr_GetStatsByProviderDesc',
        operationId: 'getCdrStatsByProvider'
    )]
    #[ApiParameterRef('dateFrom', required: true)]
    #[ApiParameterRef('dateTo', required: true)]
    #[ApiParameterRef('provider')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation_error', 'PBXApiResult')]
    public function getStatsByProvider(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete CDR record(s) by numeric ID or linkedid
     *
     * Supports two deletion modes based on ID format:
     * - Numeric ID (e.g., "718517"): Deletes single record only
     * - LinkedID (e.g., "mikopbx-1760784793.4627"): Deletes ALL records with this linkedid (entire conversation)
     *
     * Examples:
     * - DELETE /cdr/718517 → deletes single record with ID 718517
     * - DELETE /cdr/mikopbx-1760784793.4627 → deletes entire conversation (all linked records)
     * - DELETE /cdr/mikopbx-1760784793.4627?deleteRecording=true → deletes conversation + all recording files
     *
     * @route DELETE /pbxcore/api/v3/cdr/{id}
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    #[ApiOperation(
        summary: 'rest_cdr_Delete',
        description: 'rest_cdr_DeleteDesc',
        operationId: 'deleteCdr'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^([0-9]+|mikopbx-.+)$', example: '12345')]
    #[ApiParameterRef('deleteRecording')]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Stream call recording (inline playback in browser)
     *
     * Requires 'token' parameter for secure access. The token is included in 'playback_url' field
     * returned by GET /cdr or GET /cdr/{id} endpoints.
     *
     * WHY: Token already contains CDR ID - no need to pass ID separately
     * WHY PUBLIC: Browser <audio>/<video> tags can't send Authorization headers,
     *             so we use token-based security instead of Bearer token
     *
     * @route GET /pbxcore/api/v3/cdr:playback?token=xxx
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_cdr_Playback',
        description: 'rest_cdr_PlaybackDesc',
        operationId: 'playbackRecording'
    )]
    #[ApiParameterRef('token', required: true)]
    #[ApiParameterRef('view')]
    #[ApiParameterRef('format')]
    #[ApiResponse(200, 'rest_response_200_stream')]
    #[ApiResponse(206, 'rest_response_206_partial_content')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(416, 'rest_response_416_range_not_satisfiable', 'PBXApiResult')]
    public function playback(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Download call recording as file
     *
     * Requires 'token' parameter for secure access. The token is included in 'download_url' field
     * returned by GET /cdr or GET /cdr/{id} endpoints.
     *
     * WHY: Token already contains CDR ID - no need to pass ID separately
     * WHY PUBLIC: Users need direct download links without Bearer authentication,
     *             token provides sufficient security
     *
     * @route GET /pbxcore/api/v3/cdr:download?token=xxx
     */
    #[ResourceSecurity('cdr', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_cdr_Download',
        description: 'rest_cdr_DownloadDesc',
        operationId: 'downloadRecording'
    )]
    #[ApiParameterRef('token', required: true)]
    #[ApiParameterRef('view')]
    #[ApiParameterRef('filename')]
    #[ApiParameterRef('format')]
    #[ApiResponse(200, 'rest_response_200_stream')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function download(): void
    {
        // Implementation handled by BaseRestController
    }
}
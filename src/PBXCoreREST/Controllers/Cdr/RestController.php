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
#[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getActiveCalls', 'getActiveChannels', 'playback'],
        'HEAD' => ['playback']
    ],
    resourceLevelMethods: ['getRecord'],
    collectionLevelMethods: ['getList'],
    customMethods: ['getActiveCalls', 'getActiveChannels', 'playback'],
    idPattern: '[0-9]+'
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
     * Get list of currently active calls
     *
     * @route GET /pbxcore/api/v3/cdr:getActiveCalls
     */
    #[ApiOperation(
        summary: 'rest_cdr_GetActiveCalls',
        description: 'rest_cdr_GetActiveCallsDesc',
        operationId: 'getActiveCalls'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getActiveCalls(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get list of currently active channels
     *
     * @route GET /pbxcore/api/v3/cdr:getActiveChannels
     */
    #[ApiOperation(
        summary: 'rest_cdr_GetActiveChannels',
        description: 'rest_cdr_GetActiveChannelsDesc',
        operationId: 'getActiveChannels'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getActiveChannels(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Stream or download call recording
     *
     * @route GET /pbxcore/api/v3/cdr:playback
     */
    #[ApiOperation(
        summary: 'rest_cdr_Playback',
        description: 'rest_cdr_PlaybackDesc',
        operationId: 'playbackRecording'
    )]
    #[ApiParameterRef('view', required: true)]
    #[ApiParameterRef('download')]
    #[ApiParameterRef('filename')]
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
}
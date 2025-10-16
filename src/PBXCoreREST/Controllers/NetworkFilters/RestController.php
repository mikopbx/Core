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

namespace MikoPBX\PBXCoreREST\Controllers\NetworkFilters;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\NetworkFiltersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\NetworkFilters\DataStructure;
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
 * RESTful controller for network filters management (v3 API) - Read-Only
 *
 * Network filters provide read-only access to firewall rules for dropdown lists.
 * Actual filter management is done through the Firewall API.
 * Implements read operations with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\NetworkFilters
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/network-filters',
    tags: ['Network Filters'],
    description: 'Read-only access to network filters (firewall rules) for UI dropdown lists. ' .
                'Supports category-based filtering (SIP, IAX, AMI, API) and includes special localhost option. ' .
                'For creating/updating filters, use the Firewall API.',
    processor: NetworkFiltersManagementProcessor::class
)]
#[ResourceSecurity('network_filters', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getForSelect']
    ],
    resourceLevelMethods: ['getRecord'],
    collectionLevelMethods: ['getList'],
    customMethods: ['getForSelect'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = NetworkFiltersManagementProcessor::class;


    /**
     * Get list of all network filters
     *
     * @route GET /pbxcore/api/v3/network-filters
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_nf_GetList',
        description: 'rest_nf_GetListDesc',
        operationId: 'getNetworkFiltersList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: '192.168')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific network filter by ID
     *
     * @route GET /pbxcore/api/v3/network-filters/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_nf_GetRecord',
        description: 'rest_nf_GetRecordDesc',
        operationId: 'getNetworkFilterById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '1')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get network filters for dropdown/select with category filtering
     *
     * @route GET /pbxcore/api/v3/network-filters:getForSelect
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_nf_GetForSelect',
        description: 'rest_nf_GetForSelectDesc',
        operationId: 'getNetworkFiltersForSelect'
    )]
    #[ApiParameterRef('category')]
    #[ApiParameterRef('includeLocalhost')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getForSelect(): void
    {
        // Implementation handled by BaseRestController
    }

}

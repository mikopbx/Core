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

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\DataStructure;
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
 * RESTful controller for outbound routes management (v3 API)
 *
 * Comprehensive outbound call routing following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\OutboundRoutes
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/outbound-routes',    
    tags: ['Outbound Routes'],
    description: 'Outbound call routing management for directing calls to external providers. ' .
                'Features include number pattern matching (prefix-based), provider selection, ' .
                'priority-based route selection, digit manipulation, and trunk failover support.',
    processor: OutboundRoutesManagementProcessor::class
)]
#[ResourceSecurity('outbound_routes', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'copy'],
        'POST' => ['create', 'changePriority'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'copy'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'changePriority', 'copy'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = OutboundRoutesManagementProcessor::class;


    /**
     * Get list of all outbound routes with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/outbound-routes
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_obr_GetList',
        description: 'rest_obr_GetListDesc',
        operationId: 'getOutboundRoutesList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'international')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['priority', 'rulename', 'numberbeginswith'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific outbound route by ID
     *
     * @route GET /pbxcore/api/v3/outbound-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_GetRecord',
        description: 'rest_obr_GetRecordDesc',
        operationId: 'getOutboundRouteById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new outbound route
     *
     * @route POST /pbxcore/api/v3/outbound-routes
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_Create',
        description: 'rest_obr_CreateDesc',
        operationId: 'createOutboundRoute'
    )]
    #[ApiParameterRef('rulename', required: true)]
    #[ApiParameterRef('providerid', required: true)]
    #[ApiParameterRef('numberbeginswith', required: true)]
    #[ApiParameterRef('restnumbers')]
    #[ApiParameterRef('trimfrombegin')]
    #[ApiParameterRef('prepend')]
    #[ApiParameterRef('note')]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing outbound route (full replacement)
     *
     * @route PUT /pbxcore/api/v3/outbound-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_Update',
        description: 'rest_obr_UpdateDesc',
        operationId: 'updateOutboundRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameterRef('rulename', required: true)]
    #[ApiParameterRef('providerid', required: true)]
    #[ApiParameterRef('numberbeginswith', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing outbound route
     *
     * @route PATCH /pbxcore/api/v3/outbound-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_Patch',
        description: 'rest_obr_PatchDesc',
        operationId: 'patchOutboundRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameterRef('rulename')]
    #[ApiParameterRef('restnumbers')]
    #[ApiParameterRef('trimfrombegin')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete an outbound route
     *
     * @route DELETE /pbxcore/api/v3/outbound-routes/{id}
     */
    #[ApiOperation(
        summary: 'rest_obr_Delete',
        description: 'rest_obr_DeleteDesc',
        operationId: 'deleteOutboundRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get default template for new outbound route
     *
     * @route GET /pbxcore/api/v3/outbound-routes:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_GetDefault',
        description: 'rest_obr_GetDefaultDesc',
        operationId: 'getOutboundRouteDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing outbound route
     *
     * @route GET /pbxcore/api/v3/outbound-routes/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_obr_Copy',
        description: 'rest_obr_CopyDesc',
        operationId: 'copyOutboundRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update priority order for multiple outbound routes
     *
     * @route POST /pbxcore/api/v3/outbound-routes:changePriority
     */
    #[ApiOperation(
        summary: 'rest_obr_ChangePriority',
        description: 'rest_obr_ChangePriorityDesc',
        operationId: 'changeOutboundRoutePriority'
    )]
    #[ApiParameterRef('priorities', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function changePriority(): void
    {
        // Implementation handled by BaseRestController
    }

}

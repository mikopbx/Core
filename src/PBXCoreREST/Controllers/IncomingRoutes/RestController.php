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

namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutes\DataStructure;
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
 * RESTful controller for incoming routes management (v3 API)
 *
 * Comprehensive incoming route management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/incoming-routes',
    tags: ['Incoming Routes'],
    description: 'rest_IncomingRoutes_ApiDescription',
    processor: IncomingRoutesManagementProcessor::class
)]
#[ResourceSecurity('incoming_routes', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getDefaultRoute'],
        'POST' => ['create', 'changePriority', 'copy'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'copy'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'getDefaultRoute', 'changePriority', 'copy'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = IncomingRoutesManagementProcessor::class;


    /**
     * Get list of all incoming routes with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/incoming-routes
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_ir_GetList',
        description: 'rest_ir_GetListDesc',
        operationId: 'getIncomingRoutesList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: '74952345678')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['priority', 'number', 'extension', 'rulename'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('providerid')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific incoming route by ID
     *
     * @route GET /pbxcore/api/v3/incoming-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_GetRecord',
        description: 'rest_ir_GetRecordDesc',
        operationId: 'getIncomingRouteById'
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
     * Create a new incoming route
     *
     * @route POST /pbxcore/api/v3/incoming-routes
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_Create',
        description: 'rest_ir_CreateDesc',
        operationId: 'createIncomingRoute'
    )]
    // Request body parameters for create operation
    #[ApiParameterRef('rulename')]
    #[ApiParameterRef('number')]
    #[ApiParameterRef('providerid')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('audio_message_id')]
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
     * Update an existing incoming route (full replacement)
     *
     * @route PUT /pbxcore/api/v3/incoming-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_Update',
        description: 'rest_ir_UpdateDesc',
        operationId: 'updateIncomingRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameterRef('rulename')]
    #[ApiParameterRef('number')]
    #[ApiParameterRef('providerid')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('extension', required: true)]
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
     * Partially update an existing incoming route
     *
     * @route PATCH /pbxcore/api/v3/incoming-routes/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_Patch',
        description: 'rest_ir_PatchDesc',
        operationId: 'patchIncomingRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameterRef('rulename')]
    #[ApiParameterRef('number')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('extension')]
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
     * Delete an incoming route
     *
     * @route DELETE /pbxcore/api/v3/incoming-routes/{id}
     */
    #[ApiOperation(
        summary: 'rest_ir_Delete',
        description: 'rest_ir_DeleteDesc',
        operationId: 'deleteIncomingRoute'
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
     * Get default template for new incoming route
     *
     * @route GET /pbxcore/api/v3/incoming-routes:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_GetDefault',
        description: 'rest_ir_GetDefaultDesc',
        operationId: 'getIncomingRouteDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get or create the default incoming route (catch-all route with ID=1)
     *
     * @route GET /pbxcore/api/v3/incoming-routes:getDefaultRoute
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_GetDefaultRoute',
        description: 'rest_ir_GetDefaultRouteDesc',
        operationId: 'getIncomingRouteDefaultRoute'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefaultRoute(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing incoming route
     *
     * @route POST /pbxcore/api/v3/incoming-routes/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ir_Copy',
        description: 'rest_ir_CopyDesc',
        operationId: 'copyIncomingRoute'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '42')]
    #[ApiResponse(201, 'rest_response_201_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update priority order for multiple incoming routes
     *
     * @route POST /pbxcore/api/v3/incoming-routes:changePriority
     */
    #[ApiOperation(
        summary: 'rest_ir_ChangePriority',
        description: 'rest_ir_ChangePriorityDesc',
        operationId: 'changeIncomingRoutePriority'
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

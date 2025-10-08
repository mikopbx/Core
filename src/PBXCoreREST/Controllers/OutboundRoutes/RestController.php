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
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
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
    #[ApiParameter(
        name: 'limit',
        type: 'integer',
        description: 'rest_param_limit',
        in: ParameterLocation::QUERY,
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    )]
    #[ApiParameter(
        name: 'offset',
        type: 'integer',
        description: 'rest_param_offset',
        in: ParameterLocation::QUERY,
        minimum: 0,
        default: 0,
        example: 0
    )]
    #[ApiParameter(
        name: 'search',
        type: 'string',
        description: 'rest_param_search',
        in: ParameterLocation::QUERY,
        maxLength: 255,
        example: 'international'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['priority', 'rulename', 'numberbeginswith'],
        default: 'priority',
        example: 'priority'
    )]
    #[ApiParameter(
        name: 'orderWay',
        type: 'string',
        description: 'rest_param_orderWay',
        in: ParameterLocation::QUERY,
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'ASC'
    )]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '42')]
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
    #[ApiParameter('rulename', 'string', 'rest_param_obr_rulename', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'International Calls')]
    #[ApiParameter('providerid', 'string', 'rest_param_obr_providerid', ParameterLocation::QUERY, required: true, example: 'SIP-PROVIDER-123456')]
    #[ApiParameter('numberbeginswith', 'string', 'rest_param_obr_numberbeginswith', ParameterLocation::QUERY, required: true, pattern: '^[0-9*#+X]+$', maxLength: 20, example: '00')]
    #[ApiParameter('restnumbers', 'integer', 'rest_param_obr_restnumbers', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 50, default: 0, example: 9)]
    #[ApiParameter('trimfrombegin', 'integer', 'rest_param_obr_trimfrombegin', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 50, default: 0, example: 2)]
    #[ApiParameter('prepend', 'string', 'rest_param_obr_prepend', ParameterLocation::QUERY, required: false, pattern: '^[0-9*#+]*$', maxLength: 20, example: '8')]
    #[ApiParameter('note', 'string', 'rest_param_obr_note', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Route for international calls via Provider A')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameter('rulename', 'string', 'rest_param_obr_rulename', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Updated International Route')]
    #[ApiParameter('providerid', 'string', 'rest_param_obr_providerid', ParameterLocation::QUERY, required: true, example: 'SIP-PROVIDER-987654')]
    #[ApiParameter('numberbeginswith', 'string', 'rest_param_obr_numberbeginswith', ParameterLocation::QUERY, required: true, pattern: '^[0-9*#+X]+$', maxLength: 20, example: '8')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '42')]
    #[ApiParameter('rulename', 'string', 'rest_param_obr_rulename', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Updated Name')]
    #[ApiParameter('restnumbers', 'integer', 'rest_param_obr_restnumbers', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 50, example: 10)]
    #[ApiParameter('trimfrombegin', 'integer', 'rest_param_obr_trimfrombegin', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 50, example: 3)]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '42')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '42')]
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
    #[ApiParameter(
        name: 'priorities',
        type: 'array',
        description: 'rest_param_obr_priorities',
        in: ParameterLocation::QUERY,
        required: true,
        example: '[{"id":"1","priority":0},{"id":"42","priority":1},{"id":"15","priority":2}]'
    )]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function changePriority(): void
    {
        // Implementation handled by BaseRestController
    }

}

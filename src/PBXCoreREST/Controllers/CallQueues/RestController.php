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

namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure;
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
 * RESTful controller for call queues management (v3 API)
 *
 * Comprehensive call queue management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/call-queues',
    tags: ['Call Queues'],
    description: 'Comprehensive call queue management for advanced call distribution. ' .
                'Features include multiple distribution strategies (ring-all, round-robin, linear, random, least-recent), ' .
                'member management with priority/penalty settings, announcement configuration, timeout handling, ' .
                'and automatic call routing.',
    processor: CallQueuesManagementProcessor::class
)]
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'copy'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'copy'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    idPattern: 'QUEUE-[A-Fa-f0-9]{8,}'  // Support both new (8 chars) and legacy (32+ chars MD5) formats
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = CallQueuesManagementProcessor::class;
    

    /**
     * Get list of all call queues with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/call-queues
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_cq_GetList',
        description: 'rest_cq_GetListDesc',
        operationId: 'getCallQueuesList'
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
        example: 'sales'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['name', 'extension', 'strategy'],
        default: 'name',
        example: 'name'
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
    #[ApiParameter(
        name: 'strategy',
        type: 'string',
        description: 'rest_param_strategy',
        in: ParameterLocation::QUERY,
        enum: ['ringall', 'rrmemory', 'linear', 'random', 'leastrecent'],
        example: 'ringall'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific call queue by ID
     *
     * @route GET /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_GetRecord',
        description: 'rest_cq_GetRecordDesc',
        operationId: 'getCallQueueById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new call queue
     *
     * @route POST /pbxcore/api/v3/call-queues
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_Create',
        description: 'rest_cq_CreateDesc',
        operationId: 'createCallQueue'
    )]
    // Request body parameters for create operation
    #[ApiParameter('name', 'string', 'rest_param_cq_name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Sales Queue')]
    #[ApiParameter('extension', 'string', 'rest_param_cq_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2200100')]
    #[ApiParameter('description', 'string', 'rest_param_cq_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Queue for sales department calls')]
    #[ApiParameter('strategy', 'string', 'rest_param_cq_strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], default: 'ringall', example: 'ringall')]
    #[ApiParameter('seconds_to_ring_each_member', 'integer', 'rest_param_cq_seconds_to_ring', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 300, default: 15, example: 20)]
    #[ApiParameter('seconds_for_wrapup', 'integer', 'rest_param_cq_seconds_for_wrapup', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 300, default: 15, example: 10)]
    #[ApiParameter('recive_calls_while_on_a_call', 'boolean', 'rest_param_cq_recive_calls_while_on_call', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('caller_hear', 'string', 'rest_param_cq_caller_hear', ParameterLocation::QUERY, required: false, enum: ['ringing', 'musiconhold', 'mohClass'], default: 'ringing', example: 'musiconhold')]
    #[ApiParameter('announce_position', 'boolean', 'rest_param_cq_announce_position', ParameterLocation::QUERY, required: false, default: false, example: true)]
    #[ApiParameter('announce_hold_time', 'boolean', 'rest_param_cq_announce_hold_time', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('moh_sound_id', 'string', 'rest_param_cq_moh_sound_id', ParameterLocation::QUERY, required: false, example: '43')]
    #[ApiParameter('members', 'array', 'rest_param_cq_members', ParameterLocation::QUERY, required: false, example: '[{"extension":"200","priority":1},{"extension":"202","priority":2}]')]
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
     * Update an existing call queue (full replacement)
     *
     * @route PUT /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_Update',
        description: 'rest_cq_UpdateDesc',
        operationId: 'updateCallQueue'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiParameter('name', 'string', 'rest_param_cq_name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Updated Sales Queue')]
    #[ApiParameter('extension', 'string', 'rest_param_cq_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2200100')]
    #[ApiParameter('strategy', 'string', 'rest_param_cq_strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], default: 'ringall', example: 'leastrecent')]
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
     * Partially update an existing call queue
     *
     * @route PATCH /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_Patch',
        description: 'rest_cq_PatchDesc',
        operationId: 'patchCallQueue'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiParameter('name', 'string', 'rest_param_cq_name', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Updated Sales Queue')]
    #[ApiParameter('description', 'string', 'rest_param_cq_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
    #[ApiParameter('strategy', 'string', 'rest_param_cq_strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], example: 'leastrecent')]
    #[ApiParameter('seconds_to_ring_each_member', 'integer', 'rest_param_cq_seconds_to_ring', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 300, example: 25)]
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
     * Delete a call queue
     *
     * @route DELETE /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiOperation(
        summary: 'rest_cq_Delete',
        description: 'rest_cq_DeleteDesc',
        operationId: 'deleteCallQueue'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
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
     * Get default template for new call queue
     *
     * @route GET /pbxcore/api/v3/call-queues:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_GetDefault',
        description: 'rest_cq_GetDefaultDesc',
        operationId: 'getCallQueueDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing call queue
     *
     * @route GET /pbxcore/api/v3/call-queues/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cq_Copy',
        description: 'rest_cq_CopyDesc',
        operationId: 'copyCallQueue'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
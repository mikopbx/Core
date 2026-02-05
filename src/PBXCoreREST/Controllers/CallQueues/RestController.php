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
    description: 'rest_CallQueues_ApiDescription',
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
    idPattern: 'QUEUE-[A-Fa-f0-9]{4,}'  // Support 4-char IDs (current) and legacy MD5 formats
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
    // ✨ Common pagination parameters from CommonDataStructure
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'sales')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'extension', 'strategy'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    // ✨ Filter parameter using reference (inherits enum from definitions)
    #[ApiParameterRef('strategy')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
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
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    // All constraints (enum, pattern, maxLength, min/max, defaults) inherited from definitions
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('strategy')]
    #[ApiParameterRef('seconds_to_ring_each_member')]
    #[ApiParameterRef('seconds_for_wrapup')]
    #[ApiParameterRef('recive_calls_while_on_a_call')]
    #[ApiParameterRef('caller_hear')]
    #[ApiParameterRef('announce_position')]
    #[ApiParameterRef('announce_hold_time')]
    #[ApiParameterRef('moh_sound_id')]
    #[ApiParameterRef('periodic_announce_sound_id')]
    #[ApiParameterRef('periodic_announce_frequency')]
    #[ApiParameterRef('timeout_to_redirect_to_extension')]
    #[ApiParameterRef('timeout_extension')]
    #[ApiParameterRef('redirect_to_extension_if_empty')]
    #[ApiParameterRef('redirect_to_extension_if_unanswered')]
    #[ApiParameterRef('number_unanswered_calls_to_redirect')]
    #[ApiParameterRef('redirect_to_extension_if_repeat_exceeded')]
    #[ApiParameterRef('number_repeat_unanswered_to_redirect')]
    #[ApiParameterRef('callerid_prefix')]
    #[ApiParameterRef('members')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    // ✨ Lightweight references with optional overrides
    #[ApiParameterRef('name', required: true, example: 'Updated Sales Queue')]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('strategy', example: 'leastrecent')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    // ✨ Lightweight references (all optional in PATCH)
    #[ApiParameterRef('name', example: 'Updated Sales Queue')]
    #[ApiParameterRef('description', example: 'Updated description')]
    #[ApiParameterRef('strategy', example: 'leastrecent')]
    #[ApiParameterRef('seconds_to_ring_each_member', example: 25)]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
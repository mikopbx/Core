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
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity,
    ActionType
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
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION, SecurityType::API_KEY])]
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
    idPattern: 'QUEUE-[A-Z0-9]{8,}'
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
    #[ApiOperation(
        summary: 'Get call queues list',
        description: 'Retrieve paginated list of call queues with optional filtering by strategy, search term, and sorting options',
        operationId: 'getCallQueuesList'
    )]
    #[ApiParameter(
        name: 'limit',
        type: 'integer',
        description: 'Maximum number of records to return',
        in: ParameterLocation::QUERY,
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    )]
    #[ApiParameter(
        name: 'offset',
        type: 'integer',
        description: 'Number of records to skip for pagination',
        in: ParameterLocation::QUERY,
        minimum: 0,
        default: 0,
        example: 0
    )]
    #[ApiParameter(
        name: 'search',
        type: 'string',
        description: 'Search term for filtering by queue name or extension number',
        in: ParameterLocation::QUERY,
        maxLength: 255,
        example: 'sales'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'Field to order results by',
        in: ParameterLocation::QUERY,
        enum: ['name', 'extension', 'strategy'],
        default: 'name',
        example: 'name'
    )]
    #[ApiParameter(
        name: 'orderWay',
        type: 'string',
        description: 'Sort direction',
        in: ParameterLocation::QUERY,
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'ASC'
    )]
    #[ApiParameter(
        name: 'strategy',
        type: 'string',
        description: 'Filter by call distribution strategy',
        in: ParameterLocation::QUERY,
        enum: ['ringall', 'rrmemory', 'linear', 'random', 'leastrecent'],
        example: 'ringall'
    )]
    #[ApiResponse(200, 'List of call queues retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":[{"id":"QUEUE-01039964","extension":"2200555","name":"Sales Queue","description":"Updated queue description for sales team","represent":"<i class=\"users icon\"></i> Sales Queue <2200555>","strategy":"ringall","members":[],"search_index":"sales queue 2200555 updated queue description for sales team"}],"messages":[],"function":"getList","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\GetListAction::main","pid":1408,"meta":{"timestamp":"2025-09-27T12:10:32+03:00","hash":"4cf6b85219952014f2a06b4d77dad1a7f38cd886"}}')]
    #[ApiResponse(400, 'Invalid query parameters', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific call queue by ID
     *
     * @route GET /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiOperation(
        summary: 'Get call queue details',
        description: 'Retrieve detailed information about a specific call queue including all configuration options and member list',
        operationId: 'getCallQueueById'
    )]
    #[ApiParameter('id', 'string', 'Call queue unique identifier', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(200, 'Call queue details retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"QUEUE-01039964","extension":"2200555","name":"Sales Queue","description":"Updated queue description for sales team","strategy":"ringall","seconds_to_ring_each_member":"25","seconds_for_wrapup":"10","recive_calls_while_on_a_call":false,"announce_position":false,"announce_hold_time":false,"caller_hear":"musiconhold","periodic_announce_frequency":null,"timeout_to_redirect_to_extension":0,"number_unanswered_calls_to_redirect":3,"number_repeat_unanswered_to_redirect":3,"callerid_prefix":"","timeout_extension":"","redirect_to_extension_if_empty":"","redirect_to_extension_if_unanswered":"","redirect_to_extension_if_repeat_exceeded":"","periodic_announce_sound_id":"","moh_sound_id":"43","moh_sound_id_represent":"<i class=\"file audio outline icon\"></i> Звуковой файл","members":[]},"messages":[],"function":"getRecord","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\GetRecordAction::main","pid":1408,"meta":{"timestamp":"2025-09-27T12:10:37+03:00"}}')]
    #[ApiResponse(404, 'Call queue not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new call queue
     *
     * @route POST /pbxcore/api/v3/call-queues
     */
    // Request body parameters for create operation
    #[ApiParameter('name', 'string', 'Queue display name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Sales Queue')]
    #[ApiParameter('extension', 'string', 'Queue extension number (2-8 digits)', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2200100')]
    #[ApiParameter('description', 'string', 'Queue description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Queue for sales department calls')]
    #[ApiParameter('strategy', 'string', 'Call distribution strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], default: 'ringall', example: 'ringall')]
    #[ApiParameter('seconds_to_ring_each_member', 'integer', 'Ring time per member in seconds', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 300, default: 15, example: 20)]
    #[ApiParameter('seconds_for_wrapup', 'integer', 'Wrap-up time after call completion', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 300, default: 0, example: 10)]
    #[ApiParameter('recive_calls_while_on_a_call', 'boolean', 'Allow calls to busy members', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('caller_hear', 'string', 'What caller hears while waiting', ParameterLocation::QUERY, required: false, enum: ['ringing', 'musiconhold', 'mohClass'], default: 'musiconhold', example: 'musiconhold')]
    #[ApiParameter('announce_position', 'boolean', 'Announce queue position to caller', ParameterLocation::QUERY, required: false, default: false, example: true)]
    #[ApiParameter('announce_hold_time', 'boolean', 'Announce estimated hold time', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('moh_sound_id', 'string', 'Music on hold sound file ID', ParameterLocation::QUERY, required: false, example: '43')]
    #[ApiParameter('members', 'array', 'Array of queue member configurations', ParameterLocation::QUERY, required: false, example: '[{"extension":"200","priority":1},{"extension":"202","priority":2}]')]
    #[ApiResponse(201, 'Call queue created successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"QUEUE-CF423A55","extension":"2200777","name":"Support Queue","description":"Queue for technical support","strategy":"leastrecent","seconds_to_ring_each_member":"30","seconds_for_wrapup":"15","recive_calls_while_on_a_call":false,"announce_position":true,"announce_hold_time":false,"caller_hear":"ringing","periodic_announce_frequency":null,"timeout_to_redirect_to_extension":0,"number_unanswered_calls_to_redirect":3,"number_repeat_unanswered_to_redirect":3,"callerid_prefix":"","timeout_extension":"","redirect_to_extension_if_empty":"","redirect_to_extension_if_unanswered":"","redirect_to_extension_if_repeat_exceeded":"","periodic_announce_sound_id":"","moh_sound_id":"","members":[]},"messages":[],"function":"create","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\SaveRecordAction::main","pid":1406,"reload":"call-queues/modify/QUEUE-CF423A55","meta":{"timestamp":"2025-09-27T12:10:51+03:00"}}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse', example: '{"jsonapi":{"version":"1.0"},"result":false,"data":[],"messages":{"error":{"name":"Queue name is required","extension":"Extension number is required"}},"function":"create","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\SaveRecordAction::main","pid":1406,"meta":{"timestamp":"2025-09-27T12:11:15+03:00"}}')]
    #[ApiResponse(409, 'Extension number already exists', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Extension 2200100 is already in use"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing call queue (full replacement)
     *
     * @route PUT /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiOperation(
        summary: 'Update call queue',
        description: 'Update an existing call queue with new configuration. All fields will be replaced.',
        operationId: 'updateCallQueue'
    )]
    #[ApiParameter('id', 'string', 'Call queue unique identifier', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiParameter('name', 'string', 'Queue display name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Updated Sales Queue')]
    #[ApiParameter('extension', 'string', 'Queue extension number (2-8 digits)', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2200100')]
    #[ApiParameter('strategy', 'string', 'Call distribution strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], default: 'ringall', example: 'leastrecent')]
    #[ApiResponse(200, 'Call queue updated successfully', example: '{"result":true,"data":{"id":"QUEUE-2EDC283C","extension":"2200100","name":"Updated Sales Queue","strategy":"leastrecent"}}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(404, 'Call queue not found', 'ErrorResponse')]
    #[ApiResponse(409, 'Extension number conflict', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing call queue
     *
     * @route PATCH /pbxcore/api/v3/call-queues/{id}
     */
    #[ApiOperation(
        summary: 'Patch call queue',
        description: 'Partially update an existing call queue. Only provided fields will be updated.',
        operationId: 'patchCallQueue'
    )]
    #[ApiParameter('id', 'string', 'Call queue unique identifier', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiParameter('name', 'string', 'Queue display name', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Updated Sales Queue')]
    #[ApiParameter('description', 'string', 'Queue description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
    #[ApiParameter('strategy', 'string', 'Call distribution strategy', ParameterLocation::QUERY, required: false, enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'], example: 'leastrecent')]
    #[ApiParameter('seconds_to_ring_each_member', 'integer', 'Ring time per member in seconds', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 300, example: 25)]
    #[ApiResponse(200, 'Call queue patched successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"QUEUE-CF423A55","extension":"2200777","name":"Support Queue","description":"Updated support queue description","strategy":"leastrecent","seconds_to_ring_each_member":"40","seconds_for_wrapup":"15","recive_calls_while_on_a_call":false,"announce_position":true,"announce_hold_time":false,"caller_hear":"ringing","periodic_announce_frequency":null,"timeout_to_redirect_to_extension":0,"number_unanswered_calls_to_redirect":3,"number_repeat_unanswered_to_redirect":3,"callerid_prefix":"","timeout_extension":"","redirect_to_extension_if_empty":"","redirect_to_extension_if_unanswered":"","redirect_to_extension_if_repeat_exceeded":"","periodic_announce_sound_id":"","moh_sound_id":"","members":[]},"messages":[],"function":"patch","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\SaveRecordAction::main","pid":1408,"reload":"call-queues/modify/QUEUE-CF423A55","meta":{"timestamp":"2025-09-27T12:10:59+03:00"}}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(404, 'Call queue not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
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
        summary: 'Delete call queue',
        description: 'Delete an existing call queue. This action cannot be undone.',
        operationId: 'deleteCallQueue'
    )]
    #[ApiParameter('id', 'string', 'Call queue unique identifier', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(204, 'Call queue deleted successfully')]
    #[ApiResponse(404, 'Call queue not found', 'ErrorResponse')]
    #[ApiResponse(409, 'Cannot delete queue with active calls', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Cannot delete queue with active calls"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get default template for new call queue
     *
     * @route GET /pbxcore/api/v3/call-queues:getDefault
     */
    #[ApiOperation(
        summary: 'Get default call queue template',
        description: 'Returns a template with default values for creating a new call queue',
        operationId: 'getCallQueueDefault'
    )]
    #[ApiResponse(200, 'Default template retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"QUEUEBC1B9817","name":"","extension":"2200107","description":"","strategy":"ringall","seconds_to_ring_each_member":"15","seconds_for_wrapup":"15","recive_calls_while_on_a_call":"0","announce_position":"0","announce_hold_time":"0","periodic_announce_sound_id":"","periodic_announce_sound_id_represent":"","periodic_announce_frequency":0,"timeout_to_redirect_to_extension":0,"timeout_extension":"","redirect_to_extension_if_empty":"","redirect_to_extension_if_unanswered":"","redirect_to_extension_if_repeat_exceeded":"","number_unanswered_calls_to_redirect":0,"number_repeat_unanswered_to_redirect":0,"callerid_prefix":"","moh_sound_id":"","caller_hear":"mohClass","members":[],"represent":"","isNew":"1"},"messages":[],"function":"getDefault","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\CallQueues\\\\GetDefaultAction::main","pid":1404,"meta":{"timestamp":"2025-09-27T12:11:04+03:00"}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing call queue
     *
     * @route GET /pbxcore/api/v3/call-queues/{id}:copy
     */
    #[ResourceSecurity('call_queues', ActionType::WRITE, [SecurityType::LOCALHOST, SecurityType::SESSION, SecurityType::API_KEY])]  // Override: GET method but needs write permission
    #[ApiOperation(
        summary: 'Copy call queue',
        description: 'Create a copy of an existing call queue with a new extension number',
        operationId: 'copyCallQueue'
    )]
    #[ApiParameter('id', 'string', 'Source queue ID to copy', ParameterLocation::PATH, required: true, pattern: '^QUEUE-[A-Z0-9]+$', example: 'QUEUE-2EDC283C')]
    #[ApiResponse(200, 'Call queue copied successfully', example: '{"result":true,"data":{"id":"QUEUE-NEW123","extension":"2200108","name":"Sales Queue (Copy)","description":"Queue for sales department calls","strategy":"leastrecent","seconds_to_ring_each_member":"15","members":[]}}')]
    #[ApiResponse(404, 'Source queue not found', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Source queue QUEUE-123 not found for copy operation"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
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

namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for conference rooms management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 *
 * @examples Standard CRUD operations:
 * 
 * # List all conference rooms with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/conference-rooms?limit=20&offset=0&search=sales"
 * 
 * # Get specific conference room
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123
 * 
 * # Create new conference room
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/conference-rooms \
 *      -H "Content-Type: application/json" \
 *      -d '{"extension":"3000","name":"Sales Conference","pinCode":"1234"}'
 * 
 * # Full update (replace) conference room
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"extension":"3000","name":"Sales Team Meeting","pinCode":"5678"}'
 * 
 * # Partial update (modify) conference room
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"pinCode":"9999"}'
 * 
 * # Delete conference room
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new conference room
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/conference-rooms:getDefault
 *
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
#[ApiResource(
    path: '/pbxcore/api/v3/conference-rooms',
    tags: ['Conference Rooms'],
    description: 'rest_ConferenceRooms_ApiDescription',
    processor: ConferenceRoomsManagementProcessor::class
)]
#[ResourceSecurity('conference_rooms', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault'],
    idPattern: ['CONFERENCE-', 'CONFERENCE-ROOM-', 'CONFERENCE']  // Support: CONFERENCE-xxx, CONFERENCE-ROOM-xxx, CONFERENCExxx
)]
class RestController extends BaseRestController
{
    protected string $processorClass = ConferenceRoomsManagementProcessor::class;


    /**
     * Get list of all conference rooms with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/conference-rooms
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_cr_GetList',
        description: 'rest_cr_GetListDesc',
        operationId: 'getConferenceRoomsList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'sales')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'extension'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific conference room by ID
     *
     * @route GET /pbxcore/api/v3/conference-rooms/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cr_GetRecord',
        description: 'rest_cr_GetRecordDesc',
        operationId: 'getConferenceRoomById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^CONFERENCE-[A-Z0-9]{8,}$', example: 'CONFERENCE-ABCD1234')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new conference room
     *
     * @route POST /pbxcore/api/v3/conference-rooms
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cr_Create',
        description: 'rest_cr_CreateDesc',
        operationId: 'createConferenceRoom'
    )]
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('pinCode')]
    #[ApiParameterRef('description')]
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
     * Update an existing conference room (full replacement)
     *
     * @route PUT /pbxcore/api/v3/conference-rooms/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cr_Update',
        description: 'rest_cr_UpdateDesc',
        operationId: 'updateConferenceRoom'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^CONFERENCE-[A-Z0-9]{8,}$', example: 'CONFERENCE-ABCD1234')]
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('pinCode')]
    #[ApiParameterRef('description')]
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
     * Partially update an existing conference room
     *
     * @route PATCH /pbxcore/api/v3/conference-rooms/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cr_Patch',
        description: 'rest_cr_PatchDesc',
        operationId: 'patchConferenceRoom'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^CONFERENCE-[A-Z0-9]{8,}$', example: 'CONFERENCE-ABCD1234')]
    #[ApiParameterRef('name')]
    #[ApiParameterRef('extension')]
    #[ApiParameterRef('pinCode')]
    #[ApiParameterRef('description')]
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
     * Delete a conference room
     *
     * @route DELETE /pbxcore/api/v3/conference-rooms/{id}
     */
    #[ApiOperation(
        summary: 'rest_cr_Delete',
        description: 'rest_cr_DeleteDesc',
        operationId: 'deleteConferenceRoom'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^CONFERENCE-[A-Z0-9]{8,}$', example: 'CONFERENCE-ABCD1234')]
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
     * Get default template for new conference room
     *
     * @route GET /pbxcore/api/v3/conference-rooms:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cr_GetDefault',
        description: 'rest_cr_GetDefaultDesc',
        operationId: 'getConferenceRoomDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\DialplanApplications\DataStructure;
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
 * RESTful controller for dialplan applications management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 *
 * @examples Standard CRUD operations:
 * 
 * # List all dialplan applications with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/dialplan-applications?limit=20&offset=0&search=echo"
 * 
 * # Get specific dialplan application
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/dialplan-applications/APP-123
 * 
 * # Create new dialplan application
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/dialplan-applications \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Echo Test","extension":"999","type":"echo","description":"Test echo application"}'
 * 
 * # Full update (replace) dialplan application
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/dialplan-applications/APP-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Echo Service","extension":"999","type":"echo","description":"Updated echo service"}'
 * 
 * # Partial update (modify) dialplan application
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/dialplan-applications/APP-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Modified description"}'
 * 
 * # Delete dialplan application
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/dialplan-applications/APP-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new dialplan application
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/dialplan-applications:getDefault
 *
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 */
#[ApiResource(
    path: '/pbxcore/api/v3/dialplan-applications',
    tags: ['Dialplan Applications'],
    description: 'Dialplan application management for custom call handling logic and features.',
    processor: DialplanApplicationsManagementProcessor::class
)]
#[ResourceSecurity('dialplan_applications', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
    idPattern: ['DIALPLAN-', 'DIALPLAN-APPLICATION-']  // Modern: DIALPLAN-xxx, Legacy: DIALPLAN-APPLICATION-xxx
)]
class RestController extends BaseRestController
{
    protected string $processorClass = DialplanApplicationsManagementProcessor::class;


    /**
     * Get list of all dialplan applications with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/dialplan-applications
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_da_GetList',
        description: 'rest_da_GetListDesc',
        operationId: 'getDialplanApplicationsList'
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
        example: 'echo'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['name', 'extension', 'type'],
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
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific dialplan application by ID
     *
     * @route GET /pbxcore/api/v3/dialplan-applications/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_GetRecord',
        description: 'rest_da_GetRecordDesc',
        operationId: 'getDialplanApplicationById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^DIALPLAN-[A-Z0-9]{8,}$', example: 'DIALPLAN-ABCD1234')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new dialplan application
     *
     * @route POST /pbxcore/api/v3/dialplan-applications
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_Create',
        description: 'rest_da_CreateDesc',
        operationId: 'createDialplanApplication'
    )]
    #[ApiParameter('name', 'string', 'rest_param_da_name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Echo Test')]
    #[ApiParameter('extension', 'string', 'rest_param_da_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9*#]{2,8}$', example: '999')]
    #[ApiParameter('type', 'string', 'rest_param_da_type', ParameterLocation::QUERY, required: true, enum: ['echo', 'playback', 'none'], example: 'echo')]
    #[ApiParameter('description', 'string', 'rest_param_da_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Echo test application')]
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
     * Update an existing dialplan application (full replacement)
     *
     * @route PUT /pbxcore/api/v3/dialplan-applications/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_Update',
        description: 'rest_da_UpdateDesc',
        operationId: 'updateDialplanApplication'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^DIALPLAN-[A-Z0-9]{8,}$', example: 'DIALPLAN-ABCD1234')]
    #[ApiParameter('name', 'string', 'rest_param_da_name', ParameterLocation::QUERY, required: true, maxLength: 100, example: 'Updated Echo')]
    #[ApiParameter('extension', 'string', 'rest_param_da_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9*#]{2,8}$', example: '999')]
    #[ApiParameter('type', 'string', 'rest_param_da_type', ParameterLocation::QUERY, required: true, enum: ['echo', 'playback', 'none'], example: 'echo')]
    #[ApiParameter('description', 'string', 'rest_param_da_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
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
     * Partially update an existing dialplan application
     *
     * @route PATCH /pbxcore/api/v3/dialplan-applications/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_Patch',
        description: 'rest_da_PatchDesc',
        operationId: 'patchDialplanApplication'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^DIALPLAN-[A-Z0-9]{8,}$', example: 'DIALPLAN-ABCD1234')]
    #[ApiParameter('name', 'string', 'rest_param_da_name', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Patched name')]
    #[ApiParameter('extension', 'string', 'rest_param_da_extension', ParameterLocation::QUERY, required: false, pattern: '^[0-9*#]{2,8}$', example: '998')]
    #[ApiParameter('type', 'string', 'rest_param_da_type', ParameterLocation::QUERY, required: false, enum: ['echo', 'playback', 'none'], example: 'playback')]
    #[ApiParameter('description', 'string', 'rest_param_da_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Patched description')]
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
     * Delete a dialplan application
     *
     * @route DELETE /pbxcore/api/v3/dialplan-applications/{id}
     */
    #[ApiOperation(
        summary: 'rest_da_Delete',
        description: 'rest_da_DeleteDesc',
        operationId: 'deleteDialplanApplication'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^DIALPLAN-[A-Z0-9]{8,}$', example: 'DIALPLAN-ABCD1234')]
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
     * Get default template for new dialplan application
     *
     * @route GET /pbxcore/api/v3/dialplan-applications:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_GetDefault',
        description: 'rest_da_GetDefaultDesc',
        operationId: 'getDialplanApplicationDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing dialplan application with a new extension
     *
     * @route GET /pbxcore/api/v3/dialplan-applications/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_da_Copy',
        description: 'rest_da_CopyDesc',
        operationId: 'copyDialplanApplication'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^DIALPLAN-[A-Z0-9]{8,}$', example: 'DIALPLAN-ABCD1234')]
    #[ApiParameter('extension', 'string', 'rest_param_da_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9*#]{2,8}$', example: '998')]
    #[ApiResponse(201, 'rest_response_201_copied')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AsteriskRestUsersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers\DataStructure;
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
 * RESTful controller for Asterisk REST Interface (ARI) users management (v3 API)
 *
 * Comprehensive ARI users management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/asterisk-rest-users',
    tags: ['Asterisk REST Users'],
    description: 'Comprehensive Asterisk REST Interface (ARI) user management for real-time call control. ' .
                'ARI provides WebSocket-based APIs for building custom telephony applications with full ' .
                'call control capabilities. Features include user authentication, application binding, ' .
                'and permission management for ARI applications.',
    processor: AsteriskRestUsersManagementProcessor::class
)]
#[ResourceSecurity('asterisk_rest_users', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = AsteriskRestUsersManagementProcessor::class;


    /**
     * Get list of all ARI users with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/asterisk-rest-users
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_aru_GetList',
        description: 'rest_aru_GetListDesc',
        operationId: 'getAriUsersList'
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
        example: 'api_user'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['username', 'description'],
        default: 'username',
        example: 'username'
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
     * Get a specific ARI user by ID
     *
     * @route GET /pbxcore/api/v3/asterisk-rest-users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_aru_GetRecord',
        description: 'rest_aru_GetRecordDesc',
        operationId: 'getAriUserById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '5')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new ARI user
     *
     * @route POST /pbxcore/api/v3/asterisk-rest-users
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_aru_Create',
        description: 'rest_aru_CreateDesc',
        operationId: 'createAriUser'
    )]
    #[ApiParameter('username', 'string', 'rest_param_aru_username', ParameterLocation::QUERY, required: true, maxLength: 50, example: 'api_user')]
    #[ApiParameter('secret', 'string', 'rest_param_aru_secret', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'SecurePass123')]
    #[ApiParameter('description', 'string', 'rest_param_aru_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'API user for call control')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_aru_disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
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
     * Update an existing ARI user (full replacement)
     *
     * @route PUT /pbxcore/api/v3/asterisk-rest-users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_aru_Update',
        description: 'rest_aru_UpdateDesc',
        operationId: 'updateAriUser'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '5')]
    #[ApiParameter('username', 'string', 'rest_param_aru_username', ParameterLocation::QUERY, required: true, maxLength: 50, example: 'api_user_updated')]
    #[ApiParameter('secret', 'string', 'rest_param_aru_secret', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'NewSecurePass456')]
    #[ApiParameter('description', 'string', 'rest_param_aru_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated API user')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_aru_disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
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
     * Partially update an existing ARI user
     *
     * @route PATCH /pbxcore/api/v3/asterisk-rest-users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_aru_Patch',
        description: 'rest_aru_PatchDesc',
        operationId: 'patchAriUser'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '5')]
    #[ApiParameter('username', 'string', 'rest_param_aru_username', ParameterLocation::QUERY, required: false, maxLength: 50, example: 'patched_user')]
    #[ApiParameter('secret', 'string', 'rest_param_aru_secret', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'PatchedPass789')]
    #[ApiParameter('description', 'string', 'rest_param_aru_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Patched description')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_aru_disabled', ParameterLocation::QUERY, required: false, example: true)]
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
     * Delete an ARI user
     *
     * @route DELETE /pbxcore/api/v3/asterisk-rest-users/{id}
     */
    #[ApiOperation(
        summary: 'rest_aru_Delete',
        description: 'rest_aru_DeleteDesc',
        operationId: 'deleteAriUser'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '5')]
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
     * Get default template for new ARI user
     *
     * @route GET /pbxcore/api/v3/asterisk-rest-users:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_aru_GetDefault',
        description: 'rest_aru_GetDefaultDesc',
        operationId: 'getAriUserDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }
}
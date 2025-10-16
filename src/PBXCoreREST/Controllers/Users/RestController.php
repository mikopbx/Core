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

namespace MikoPBX\PBXCoreREST\Controllers\Users;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\UsersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Users\DataStructure;
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
 * RESTful controller for users management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/users")
 *
 * @examples Standard CRUD operations:
 *
 * # List all users with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/users?limit=20&offset=0"
 *
 * # Get specific user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/users/123
 *
 * # Create new user
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/users \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"user@example.com","username":"newuser","password":"secure123"}'
 *
 * # Full update (replace) user
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"updated@example.com","username":"updateduser"}'
 *
 * # Partial update (modify) user
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"newemail@example.com"}'
 *
 * # Delete user
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/users/123
 *
 * @examples Custom method operations:
 *
 * # Check email availability
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/users:available?email=test@example.com"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Users
 */
#[ApiResource(
    path: '/pbxcore/api/v3/users',
    tags: ['Users'],
    description: 'User account management for admin interface access. Supports full CRUD operations plus custom methods for email availability checking. Users can authenticate to the admin interface and have personalized settings like language and avatar.',
    processor: UsersManagementProcessor::class
)]
#[ResourceSecurity('users', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'available'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create', 'available'],
    customMethods: ['available'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = UsersManagementProcessor::class;

    /**
     * List all users
     *
     * Retrieves a paginated list of all users in the system.
     * Supports filtering, sorting, and pagination.
     *
     * @route GET /pbxcore/api/v3/users
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_users_GetList',
        description: 'rest_users_GetListDesc',
        operationId: 'listUsers'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list', 'UserList')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific user by ID
     *
     * Retrieves detailed information about a specific user.
     *
     * @route GET /pbxcore/api/v3/users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_users_GetRecord',
        description: 'rest_users_GetRecordDesc',
        operationId: 'getUser'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_detail', 'User')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new user
     *
     * Creates a new user account with the provided data.
     *
     * @route POST /pbxcore/api/v3/users
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_users_Create',
        description: 'rest_users_CreateDesc',
        operationId: 'createUser'
    )]
    #[ApiResponse(201, 'rest_response_201_created', 'User')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update (replace) a user
     *
     * Replaces all fields of an existing user with the provided data.
     *
     * @route PUT /pbxcore/api/v3/users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_users_Update',
        description: 'rest_users_UpdateDesc',
        operationId: 'updateUser'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_updated', 'User')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Patch (partially update) a user
     *
     * Updates only the specified fields of an existing user.
     *
     * @route PATCH /pbxcore/api/v3/users/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_users_Patch',
        description: 'rest_users_PatchDesc',
        operationId: 'patchUser'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_updated', 'User')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function patch(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete a user
     *
     * Permanently removes a user from the system.
     *
     * @route DELETE /pbxcore/api/v3/users/{id}
     */
    #[ApiOperation(
        summary: 'rest_users_Delete',
        description: 'rest_users_DeleteDesc',
        operationId: 'deleteUser'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(204, 'rest_response_204_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function delete(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check email availability
     *
     * Checks if a specific email address is available for use.
     * This is useful for validating user input during registration or email updates.
     *
     * @route GET /pbxcore/api/v3/users:available
     */
    #[ApiOperation(
        summary: 'rest_users_Available',
        description: 'rest_users_AvailableDesc',
        operationId: 'checkEmailAvailability'
    )]
    #[ApiParameterRef('email', required: true)]
    #[ApiResponse(200, 'rest_response_200_availability_checked', 'UserAvailability')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function available(): void
    {
        // Implementation handled by BaseRestController
    }
}
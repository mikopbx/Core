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

namespace MikoPBX\PBXCoreREST\Controllers\ApiKeys;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ApiKeysManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\ApiKeys\DataStructure;
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
 * RESTful controller for API keys management (v3 API)
 *
 * Comprehensive API keys management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\ApiKeys
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/api-keys',
    tags: ['API Keys'],
    description: 'Comprehensive API keys management for secure REST API access. ' .
                'Features include JWT token generation, permission management, endpoint restrictions, ' .
                'network filtering, and key lifecycle management. API keys provide secure programmatic ' .
                'access to the PBX REST API with fine-grained access control.',
    processor: ApiKeysManagementProcessor::class
)]
#[ResourceSecurity('api_keys', requirements: [SecurityType::LOCALHOST])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getAvailableControllers'],
        'POST' => ['create', 'generateKey'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create', 'generateKey', 'getAvailableControllers'],
    customMethods: ['getDefault', 'getAvailableControllers', 'generateKey'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ApiKeysManagementProcessor::class;


    /**
     * Get list of all API keys with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/api-keys
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_ak_GetList',
        description: 'rest_ak_GetListDesc',
        operationId: 'getApiKeysList'
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
        example: 'CRM'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['description', 'created_at'],
        default: 'description',
        example: 'description'
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
     * Get a specific API key by ID
     *
     * @route GET /pbxcore/api/v3/api-keys/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ak_GetRecord',
        description: 'rest_ak_GetRecordDesc',
        operationId: 'getApiKeyById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '12')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new API key
     *
     * @route POST /pbxcore/api/v3/api-keys
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ak_Create',
        description: 'rest_ak_CreateDesc',
        operationId: 'createApiKey'
    )]
    #[ApiParameter('description', 'string', 'rest_param_ak_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'CRM Integration Key')]
    #[ApiParameter('enabled', 'boolean', 'rest_param_ak_enabled', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiParameter('full_permissions', 'boolean', 'rest_param_ak_full_permissions', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('allowed_paths', 'array', 'rest_param_ak_allowed_paths', ParameterLocation::QUERY, required: false, example: '["/api/v3/employees","/api/v3/extensions"]')]
    #[ApiParameter('network_filter_id', 'string', 'rest_param_ak_network_filter_id', ParameterLocation::QUERY, required: false, example: '5')]
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
     * Update an existing API key (full replacement)
     *
     * @route PUT /pbxcore/api/v3/api-keys/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ak_Update',
        description: 'rest_ak_UpdateDesc',
        operationId: 'updateApiKey'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '12')]
    #[ApiParameter('description', 'string', 'rest_param_ak_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Updated CRM Key')]
    #[ApiParameter('enabled', 'boolean', 'rest_param_ak_enabled', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiParameter('full_permissions', 'boolean', 'rest_param_ak_full_permissions', ParameterLocation::QUERY, required: false, default: false, example: true)]
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
     * Partially update an existing API key
     *
     * @route PATCH /pbxcore/api/v3/api-keys/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ak_Patch',
        description: 'rest_ak_PatchDesc',
        operationId: 'patchApiKey'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '12')]
    #[ApiParameter('description', 'string', 'rest_param_ak_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Patched Description')]
    #[ApiParameter('enabled', 'boolean', 'rest_param_ak_enabled', ParameterLocation::QUERY, required: false, example: false)]
    #[ApiParameter('allowed_paths', 'array', 'rest_param_ak_allowed_paths', ParameterLocation::QUERY, required: false, example: '["/api/v3/employees"]')]
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
     * Delete an API key
     *
     * @route DELETE /pbxcore/api/v3/api-keys/{id}
     */
    #[ApiOperation(
        summary: 'rest_ak_Delete',
        description: 'rest_ak_DeleteDesc',
        operationId: 'deleteApiKey'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '12')]
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
     * Get default template for new API key
     *
     * @route GET /pbxcore/api/v3/api-keys:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ak_GetDefault',
        description: 'rest_ak_GetDefaultDesc',
        operationId: 'getApiKeyDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get list of available API controllers and endpoints
     *
     * @route GET /pbxcore/api/v3/api-keys:getAvailableControllers
     */
    #[ApiOperation(
        summary: 'rest_ak_GetAvailableControllers',
        description: 'rest_ak_GetAvailableControllersDesc',
        operationId: 'getAvailableControllers'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getAvailableControllers(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Generate new random API key
     *
     * @route POST /pbxcore/api/v3/api-keys:generateKey
     */
    #[ApiOperation(
        summary: 'rest_ak_GenerateKey',
        description: 'rest_ak_GenerateKeyDesc',
        operationId: 'generateApiKey'
    )]
    #[ApiResponse(200, 'rest_response_200_generated')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function generateKey(): void
    {
        // Implementation handled by BaseRestController
    }
}
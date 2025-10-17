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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\DataStructure;
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
 * RESTful controller for Asterisk managers management (v3 API)
 *
 * Comprehensive Asterisk Manager Interface (AMI) user management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/asterisk-managers',    
    tags: ['Asterisk Managers'],
    description: 'Asterisk Manager Interface (AMI) user management for PBX administration. ' .
                'AMI users provide programmatic access to Asterisk for monitoring, control, and integration. ' .
                'Features include permission management, secure authentication, and administrative access controls.',
    processor: AsteriskManagersManagementProcessor::class
)]
#[ResourceSecurity('asterisk_managers', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = AsteriskManagersManagementProcessor::class;


    /**
     * Get list of all Asterisk managers with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/asterisk-managers
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_am_GetList',
        description: 'rest_am_GetListDesc',
        operationId: 'getAsteriskManagersList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'admin')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['username', 'description'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get specific Asterisk manager by ID
     *
     * @route GET /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_GetRecord',
        description: 'rest_am_GetRecordDesc',
        operationId: 'getAsteriskManager'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '53')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create new Asterisk manager
     *
     * @route POST /pbxcore/api/v3/asterisk-managers
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_Create',
        description: 'rest_am_CreateDesc',
        operationId: 'createAsteriskManager'
    )]
    #[ApiParameterRef('username', required: true)]
    #[ApiParameterRef('secret', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('networkfilterid')]
    #[ApiParameterRef('permissions')]
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
     * Update Asterisk manager (full replacement)
     *
     * @route PUT /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_Update',
        description: 'rest_am_UpdateDesc',
        operationId: 'updateAsteriskManager'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '53')]
    #[ApiParameterRef('username', required: true)]
    #[ApiParameterRef('secret', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('networkfilterid')]
    #[ApiParameterRef('permissions')]
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
     * Partially update Asterisk manager
     *
     * @route PATCH /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_Patch',
        description: 'rest_am_PatchDesc',
        operationId: 'patchAsteriskManager'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '53')]
    #[ApiParameterRef('username')]
    #[ApiParameterRef('secret')]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('networkfilterid')]
    #[ApiParameterRef('permissions')]
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
     * Delete Asterisk manager
     *
     * @route DELETE /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiOperation(
        summary: 'rest_am_Delete',
        description: 'rest_am_DeleteDesc',
        operationId: 'deleteAsteriskManager'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '53')]
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
     * Get default values for new Asterisk manager
     *
     * @route GET /pbxcore/api/v3/asterisk-managers:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_GetDefault',
        description: 'rest_am_GetDefaultDesc',
        operationId: 'getAsteriskManagerDefaults'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy existing Asterisk manager
     *
     * @route GET /pbxcore/api/v3/asterisk-managers/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_am_Copy',
        description: 'rest_am_CopyDesc',
        operationId: 'copyAsteriskManager'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '53')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }
}
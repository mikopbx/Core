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

namespace MikoPBX\PBXCoreREST\Controllers\IvrMenu;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\IvrMenuManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\IvrMenu\DataStructure;
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
 * RESTful controller for IVR menu management (v3 API)
 *
 * Comprehensive IVR (Interactive Voice Response) menu management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\IvrMenu
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/ivr-menu',
    tags: ['IVR Menu'],
    description: 'rest_IvrMenu_ApiDescription',
    processor: IvrMenuManagementProcessor::class
)]
#[ResourceSecurity('ivr_menu', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
    idPattern: 'IVR-[A-Fa-f0-9]{4,}'  // Support 4-char IDs (current) and legacy MD5 formats
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = IvrMenuManagementProcessor::class;


    /**
     * Get list of all IVR menus with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/ivr-menu
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_ivr_GetList',
        description: 'rest_ivr_GetListDesc',
        operationId: 'getIvrMenuList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'main menu')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'extension', 'timeout'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific IVR menu by ID
     *
     * @route GET /pbxcore/api/v3/ivr-menu/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_GetRecord',
        description: 'rest_ivr_GetRecordDesc',
        operationId: 'getIvrMenuById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new IVR menu
     *
     * @route POST /pbxcore/api/v3/ivr-menu
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_Create',
        description: 'rest_ivr_CreateDesc',
        operationId: 'createIvrMenu'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('timeout_extension')]
    #[ApiParameterRef('number_of_repeat')]
    #[ApiParameterRef('allow_enter_any_internal_extension')]
    #[ApiParameterRef('audio_message_id')]
    #[ApiParameterRef('actions')]
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
     * Update an existing IVR menu (full replacement)
     *
     * @route PUT /pbxcore/api/v3/ivr-menu/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_Update',
        description: 'rest_ivr_UpdateDesc',
        operationId: 'updateIvrMenu'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('timeout_extension')]
    #[ApiParameterRef('number_of_repeat')]
    #[ApiParameterRef('allow_enter_any_internal_extension')]
    #[ApiParameterRef('audio_message_id')]
    #[ApiParameterRef('actions')]
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
     * Partially update an existing IVR menu
     *
     * @route PATCH /pbxcore/api/v3/ivr-menu/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_Patch',
        description: 'rest_ivr_PatchDesc',
        operationId: 'patchIvrMenu'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('name')]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('timeout')]
    #[ApiParameterRef('number_of_repeat')]
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
     * Delete an IVR menu
     *
     * @route DELETE /pbxcore/api/v3/ivr-menu/{id}
     */
    #[ApiOperation(
        summary: 'rest_ivr_Delete',
        description: 'rest_ivr_DeleteDesc',
        operationId: 'deleteIvrMenu'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
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
     * Get default template for new IVR menu
     *
     * @route GET /pbxcore/api/v3/ivr-menu:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_GetDefault',
        description: 'rest_ivr_GetDefaultDesc',
        operationId: 'getIvrMenuDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing IVR menu
     *
     * @route GET /pbxcore/api/v3/ivr-menu/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ivr_Copy',
        description: 'rest_ivr_CopyDesc',
        operationId: 'copyIvrMenu'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
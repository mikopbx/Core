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
    description: 'Comprehensive IVR menu management for automated call routing and self-service. ' .
                'Features include customizable menu options, timeout handling, audio file assignments, ' .
                'digit-based navigation, and flexible routing rules for creating sophisticated ' .
                'automated attendant systems.',
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
    idPattern: 'IVR-[A-Fa-f0-9]{8,}'  // Support both new (8 chars) and legacy (32+ chars MD5) formats
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
        example: 'main menu'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['name', 'extension', 'timeout'],
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
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
    // Request body parameters for create operation
    #[ApiParameter('name', 'string', 'rest_param_ivr_name', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Main Menu')]
    #[ApiParameter('extension', 'string', 'rest_param_ivr_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2000')]
    #[ApiParameter('description', 'string', 'rest_param_ivr_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Company main menu')]
    #[ApiParameter('timeout', 'integer', 'rest_param_ivr_timeout', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 60, default: 7, example: 7)]
    #[ApiParameter('timeout_extension', 'string', 'rest_param_ivr_timeout_extension', ParameterLocation::QUERY, required: false, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('number_of_repeat', 'integer', 'rest_param_ivr_number_of_repeat', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 10, default: 3, example: 3)]
    #[ApiParameter('allow_enter_any_internal_extension', 'boolean', 'rest_param_ivr_allow_enter_any_internal_extension', ParameterLocation::QUERY, required: false, default: false, example: true)]
    #[ApiParameter('audio_message_id', 'string', 'rest_param_ivr_audio_message_id', ParameterLocation::QUERY, required: false, example: '12')]
    #[ApiParameter('actions', 'array', 'rest_param_ivr_actions', ParameterLocation::QUERY, required: false, example: '[{"digits":"1","extension":"201"},{"digits":"2","extension":"202"}]')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    #[ApiParameter('name', 'string', 'rest_param_ivr_name', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Updated Main Menu')]
    #[ApiParameter('extension', 'string', 'rest_param_ivr_extension', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '2000')]
    #[ApiParameter('description', 'string', 'rest_param_ivr_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated company main menu')]
    #[ApiParameter('timeout', 'integer', 'rest_param_ivr_timeout', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 60, default: 7, example: 10)]
    #[ApiParameter('timeout_extension', 'string', 'rest_param_ivr_timeout_extension', ParameterLocation::QUERY, required: false, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('number_of_repeat', 'integer', 'rest_param_ivr_number_of_repeat', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 10, default: 3, example: 3)]
    #[ApiParameter('allow_enter_any_internal_extension', 'boolean', 'rest_param_ivr_allow_enter_any_internal_extension', ParameterLocation::QUERY, required: false, default: false, example: true)]
    #[ApiParameter('audio_message_id', 'string', 'rest_param_ivr_audio_message_id', ParameterLocation::QUERY, required: false, example: '12')]
    #[ApiParameter('actions', 'array', 'rest_param_ivr_actions', ParameterLocation::QUERY, required: false, example: '[{"digits":"1","extension":"201"},{"digits":"2","extension":"202"}]')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    #[ApiParameter('name', 'string', 'rest_param_ivr_name', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated Menu Name')]
    #[ApiParameter('description', 'string', 'rest_param_ivr_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
    #[ApiParameter('timeout', 'integer', 'rest_param_ivr_timeout', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 60, example: 10)]
    #[ApiParameter('number_of_repeat', 'integer', 'rest_param_ivr_number_of_repeat', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 10, example: 5)]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^IVR-[A-Z0-9]+$', example: 'IVR-A1B2C3D4')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
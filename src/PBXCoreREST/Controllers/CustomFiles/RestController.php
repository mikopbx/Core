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

namespace MikoPBX\PBXCoreREST\Controllers\CustomFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CustomFilesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\CustomFiles\DataStructure;
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
 * RESTful controller for custom files management (v3 API)
 *
 * Comprehensive custom files management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\CustomFiles
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/custom-files',
    tags: ['Custom Files'],
    description: 'Comprehensive custom files management for system configuration customization. ' .
                'Allows managing custom configuration files that are automatically restored after system updates. ' .
                'Supports multiple modes: override (replace file), append (add content), script (executable). ' .
                'Content is stored as base64-encoded strings for binary safety.',
    processor: CustomFilesManagementProcessor::class
)]
#[ResourceSecurity('custom_files', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
    protected string $processorClass = CustomFilesManagementProcessor::class;


    /**
     * Get list of all custom files with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/custom-files
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_cf_GetList',
        description: 'rest_cf_GetListDesc',
        operationId: 'getCustomFilesList'
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
        example: '/etc'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['filepath', 'mode'],
        default: 'filepath',
        example: 'filepath'
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
     * Get a specific custom file by ID
     *
     * @route GET /pbxcore/api/v3/custom-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cf_GetRecord',
        description: 'rest_cf_GetRecordDesc',
        operationId: 'getCustomFileById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '15')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new custom file
     *
     * @route POST /pbxcore/api/v3/custom-files
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cf_Create',
        description: 'rest_cf_CreateDesc',
        operationId: 'createCustomFile'
    )]
    #[ApiParameter('filepath', 'string', 'rest_param_cf_filepath', ParameterLocation::QUERY, required: true, maxLength: 500, example: '/etc/asterisk/custom.conf')]
    #[ApiParameter('content', 'string', 'rest_param_cf_content', ParameterLocation::QUERY, required: true, example: 'base64_encoded_content')]
    #[ApiParameter('mode', 'string', 'rest_param_cf_mode', ParameterLocation::QUERY, required: true, enum: ['override', 'append', 'script'], example: 'append')]
    #[ApiParameter('description', 'string', 'rest_param_cf_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Custom Asterisk configuration')]
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
     * Update an existing custom file (full replacement)
     *
     * @route PUT /pbxcore/api/v3/custom-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cf_Update',
        description: 'rest_cf_UpdateDesc',
        operationId: 'updateCustomFile'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '15')]
    #[ApiParameter('filepath', 'string', 'rest_param_cf_filepath', ParameterLocation::QUERY, required: true, maxLength: 500, example: '/etc/asterisk/custom.conf')]
    #[ApiParameter('content', 'string', 'rest_param_cf_content', ParameterLocation::QUERY, required: true, example: 'new_base64_encoded_content')]
    #[ApiParameter('mode', 'string', 'rest_param_cf_mode', ParameterLocation::QUERY, required: true, enum: ['override', 'append', 'script'], example: 'override')]
    #[ApiParameter('description', 'string', 'rest_param_cf_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
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
     * Partially update an existing custom file
     *
     * @route PATCH /pbxcore/api/v3/custom-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cf_Patch',
        description: 'rest_cf_PatchDesc',
        operationId: 'patchCustomFile'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '15')]
    #[ApiParameter('filepath', 'string', 'rest_param_cf_filepath', ParameterLocation::QUERY, required: false, maxLength: 500, example: '/etc/custom.conf')]
    #[ApiParameter('content', 'string', 'rest_param_cf_content', ParameterLocation::QUERY, required: false, example: 'patched_base64_content')]
    #[ApiParameter('mode', 'string', 'rest_param_cf_mode', ParameterLocation::QUERY, required: false, enum: ['override', 'append', 'script'], example: 'script')]
    #[ApiParameter('description', 'string', 'rest_param_cf_description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Patched description')]
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
     * Delete a custom file
     *
     * @route DELETE /pbxcore/api/v3/custom-files/{id}
     */
    #[ApiOperation(
        summary: 'rest_cf_Delete',
        description: 'rest_cf_DeleteDesc',
        operationId: 'deleteCustomFile'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[0-9]+$', example: '15')]
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
     * Get default template for new custom file
     *
     * @route GET /pbxcore/api/v3/custom-files:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_cf_GetDefault',
        description: 'rest_cf_GetDefaultDesc',
        operationId: 'getCustomFileDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ExtensionsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Extensions\DataStructure;
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
 * RESTful controller for extensions management (v3 API)
 *
 * Comprehensive extensions management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Extensions
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/extensions',
    tags: ['Extensions'],
    description: 'Comprehensive extensions management for all PBX extension numbers. ' .
                'Extensions are created through various entities (Employees, IVR menus, Queues, etc.). ' .
                'This API provides unified access to list, search, and manage all extension numbers ' .
                'with type information and availability checking.',
    processor: ExtensionsManagementProcessor::class
)]
#[ResourceSecurity('extensions', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getForSelect'],
        'POST' => ['create', 'available', 'getPhonesRepresent', 'getPhoneRepresent'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'getPhoneRepresent'],
    collectionLevelMethods: ['getList', 'create', 'available', 'getPhonesRepresent'],
    customMethods: ['getDefault', 'getForSelect', 'available', 'getPhonesRepresent', 'getPhoneRepresent'],
    idPattern: '[0-9]{2,8}'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ExtensionsManagementProcessor::class;


    /**
     * Get list of all extensions with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/extensions
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_ext_GetList',
        description: 'rest_ext_GetListDesc',
        operationId: 'getExtensionsList'
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
        example: '200'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['number', 'type', 'callerid'],
        default: 'number',
        example: 'number'
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
    #[ApiParameter(
        name: 'type',
        type: 'string',
        description: 'rest_param_ext_type_filter',
        in: ParameterLocation::QUERY,
        enum: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
        example: 'SIP'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific extension by number
     *
     * @route GET /pbxcore/api/v3/extensions/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ext_GetRecord',
        description: 'rest_ext_GetRecordDesc',
        operationId: 'getExtensionByNumber'
    )]
    #[ApiParameter('id', 'string', 'rest_param_ext_number', ParameterLocation::PATH, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new extension
     *
     * @route POST /pbxcore/api/v3/extensions
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ext_Create',
        description: 'rest_ext_CreateDesc',
        operationId: 'createExtension'
    )]
    #[ApiParameter('number', 'string', 'rest_param_ext_number', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('type', 'string', 'rest_param_ext_type', ParameterLocation::QUERY, required: true, enum: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'], example: 'SIP')]
    #[ApiParameter('callerid', 'string', 'rest_param_ext_callerid', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'John Doe')]
    #[ApiParameter('userid', 'string', 'rest_param_ext_userid', ParameterLocation::QUERY, required: false, example: '12')]
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
     * Update an existing extension (full replacement)
     *
     * @route PUT /pbxcore/api/v3/extensions/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ext_Update',
        description: 'rest_ext_UpdateDesc',
        operationId: 'updateExtension'
    )]
    #[ApiParameter('id', 'string', 'rest_param_ext_number', ParameterLocation::PATH, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('type', 'string', 'rest_param_ext_type', ParameterLocation::QUERY, required: true, enum: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'], example: 'SIP')]
    #[ApiParameter('callerid', 'string', 'rest_param_ext_callerid', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Jane Doe')]
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
     * Partially update an existing extension
     *
     * @route PATCH /pbxcore/api/v3/extensions/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ext_Patch',
        description: 'rest_ext_PatchDesc',
        operationId: 'patchExtension'
    )]
    #[ApiParameter('id', 'string', 'rest_param_ext_number', ParameterLocation::PATH, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('callerid', 'string', 'rest_param_ext_callerid', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'Updated Name')]
    #[ApiParameter('type', 'string', 'rest_param_ext_type', ParameterLocation::QUERY, required: false, enum: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'], example: 'SIP')]
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
     * Delete an extension
     *
     * @route DELETE /pbxcore/api/v3/extensions/{id}
     */
    #[ApiOperation(
        summary: 'rest_ext_Delete',
        description: 'rest_ext_DeleteDesc',
        operationId: 'deleteExtension'
    )]
    #[ApiParameter('id', 'string', 'rest_param_ext_number', ParameterLocation::PATH, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
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
     * Get default template for new extension
     *
     * @route GET /pbxcore/api/v3/extensions:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ext_GetDefault',
        description: 'rest_ext_GetDefaultDesc',
        operationId: 'getExtensionDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get extensions formatted for dropdown select
     *
     * @route GET /pbxcore/api/v3/extensions:getForSelect
     */
    #[ApiOperation(
        summary: 'rest_ext_GetForSelect',
        description: 'rest_ext_GetForSelectDesc',
        operationId: 'getExtensionsForSelect'
    )]
    #[ApiParameter(
        name: 'type',
        type: 'string',
        description: 'rest_param_ext_type_filter',
        in: ParameterLocation::QUERY,
        enum: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
        example: 'SIP'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getForSelect(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check if extension number is available
     *
     * @route POST /pbxcore/api/v3/extensions:available
     */
    #[ApiOperation(
        summary: 'rest_ext_Available',
        description: 'rest_ext_AvailableDesc',
        operationId: 'checkExtensionAvailable'
    )]
    #[ApiParameter('number', 'string', 'rest_param_ext_number', ParameterLocation::QUERY, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiResponse(200, 'rest_response_200_available')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function available(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get phone representations for multiple extensions
     *
     * @route POST /pbxcore/api/v3/extensions:getPhonesRepresent
     */
    #[ApiOperation(
        summary: 'rest_ext_GetPhonesRepresent',
        description: 'rest_ext_GetPhonesRepresentDesc',
        operationId: 'getPhonesRepresent'
    )]
    #[ApiParameter('numbers', 'array', 'rest_param_ext_numbers', ParameterLocation::QUERY, required: true, example: '["201","202","203"]')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getPhonesRepresent(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get phone representation for a specific extension
     *
     * @route POST /pbxcore/api/v3/extensions/{id}:getPhoneRepresent
     */
    #[ApiOperation(
        summary: 'rest_ext_GetPhoneRepresent',
        description: 'rest_ext_GetPhoneRepresentDesc',
        operationId: 'getPhoneRepresent'
    )]
    #[ApiParameter('id', 'string', 'rest_param_ext_number', ParameterLocation::PATH, required: true, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getPhoneRepresent(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
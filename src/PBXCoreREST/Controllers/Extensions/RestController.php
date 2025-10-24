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
 * RESTful controller for extensions management (v3 API)
 *
 * ⚠️ IMPORTANT: Extensions are READ-ONLY via this API
 *
 * Extensions are managed through other entities:
 * - CREATE: Use /pbxcore/api/v3/employees (creates User + Extension + Sip)
 * - UPDATE: Use /pbxcore/api/v3/employees/{id} (updates associated extensions)
 * - DELETE: Use /pbxcore/api/v3/employees/{id} (cascades to extensions)
 *
 * This API provides:
 * - READ operations: getList, getRecord
 * - Utility methods: available (check if number is free), getForSelect (dropdown data)
 * - Representation methods: getPhonesRepresent, getPhoneRepresent (HTML representation)
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Extensions
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/extensions',
    tags: ['Extensions'],
    description: 'rest_Extensions_ApiDescription',
    processor: ExtensionsManagementProcessor::class
)]
#[ResourceSecurity('extensions', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getForSelect'],
        'POST' => ['available', 'getPhonesRepresent', 'getPhoneRepresent']
    ],
    resourceLevelMethods: ['getRecord', 'getPhoneRepresent'],
    collectionLevelMethods: ['getList', 'available', 'getPhonesRepresent'],
    customMethods: ['getForSelect', 'available', 'getPhonesRepresent', 'getPhoneRepresent'],
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
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: '200')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['number', 'type', 'callerid'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('type')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]{2,8}$', example: '201', description: 'rest_ext_id')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
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
    #[ApiParameterRef('type')]
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
    #[ApiParameterRef('number', required: true)]
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
    #[ApiParameterRef('numbers', required: true)]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]{2,8}$', example: '201', description: 'rest_ext_id')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getPhoneRepresent(string $id): void
    {
        // Implementation handled by BaseRestController
    }

}
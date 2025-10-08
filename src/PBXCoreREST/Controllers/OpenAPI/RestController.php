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

namespace MikoPBX\PBXCoreREST\Controllers\OpenAPI;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\OpenAPIManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for OpenAPI specification management (v3 API)
 *
 * Provides comprehensive access to OpenAPI documentation and metadata for the MikoPBX REST API.
 * Implements singleton resource pattern as there's only one OpenAPI specification in the system.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\OpenAPI
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/openapi',
    tags: ['OpenAPI Documentation'],
    description: 'OpenAPI specification and documentation management for MikoPBX REST API. ' .
                'Provides access to API documentation, ACL rules, validation schemas, and metadata. ' .
                'Singleton resource pattern - only one specification exists. ' .
                'All endpoints require authentication for security.',
    processor: OpenAPIManagementProcessor::class
)]
#[ResourceSecurity('openapi', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getSpecification', 'getAclRules', 'getValidationSchemas'],
        'POST' => ['clearCache'],
        'DELETE' => ['clearCache']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getList', 'clearCache'],
    customMethods: ['getSpecification', 'getAclRules', 'getValidationSchemas', 'clearCache']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = OpenAPIManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Get OpenAPI specification
     *
     * @route GET /pbxcore/api/v3/openapi
     */
    #[ApiOperation(
        summary: 'rest_openapi_GetSpec',
        description: 'rest_openapi_GetSpecDesc',
        operationId: 'getOpenAPISpecification'
    )]
    #[ApiParameter(
        name: 'format',
        type: 'string',
        description: 'rest_param_openapi_format',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['json', 'yaml'],
        default: 'json',
        example: 'json'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get OpenAPI specification (alias for getList)
     *
     * @route GET /pbxcore/api/v3/openapi:getSpecification
     */
    #[ApiOperation(
        summary: 'rest_openapi_GetSpec',
        description: 'rest_openapi_GetSpecDesc',
        operationId: 'getOpenAPISpecificationExplicit'
    )]
    #[ApiParameter(
        name: 'format',
        type: 'string',
        description: 'rest_param_openapi_format',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['json', 'yaml'],
        default: 'json',
        example: 'yaml'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getSpecification(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get ACL rules extracted from API metadata
     *
     * @route GET /pbxcore/api/v3/openapi:getAclRules
     */
    #[ApiOperation(
        summary: 'rest_openapi_GetAcl',
        description: 'rest_openapi_GetAclDesc',
        operationId: 'getAPIAclRules'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getAclRules(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get validation schemas for API endpoints
     *
     * @route GET /pbxcore/api/v3/openapi:getValidationSchemas
     */
    #[ApiOperation(
        summary: 'rest_openapi_GetSchemas',
        description: 'rest_openapi_GetSchemasDesc',
        operationId: 'getAPIValidationSchemas'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getValidationSchemas(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Clear OpenAPI metadata cache
     *
     * @route POST /pbxcore/api/v3/openapi:clearCache
     * @route DELETE /pbxcore/api/v3/openapi:clearCache
     */
    #[ApiOperation(
        summary: 'rest_openapi_ClearCache',
        description: 'rest_openapi_ClearCacheDesc',
        operationId: 'clearOpenAPICache'
    )]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function clearCache(): void
    {
        // Implementation handled by BaseRestController
    }
}
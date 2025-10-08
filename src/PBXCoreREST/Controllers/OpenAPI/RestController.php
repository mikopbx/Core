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
    ResourceSecurity,
    ActionType
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
        summary: 'Get OpenAPI specification',
        description: 'Retrieve the complete OpenAPI 3.1 specification for MikoPBX REST API in JSON or YAML format',
        operationId: 'getOpenAPISpecification'
    )]
    #[ApiParameter(
        name: 'format',
        type: 'string',
        description: 'Output format for the specification',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['json', 'yaml'],
        default: 'json',
        example: 'json'
    )]
    #[ApiResponse(200, 'OpenAPI specification retrieved successfully', example: '{"openapi":"3.1.0","info":{"title":"MikoPBX REST API","version":"3.0.0","description":"Comprehensive REST API for MikoPBX management"},"servers":[{"url":"http://127.0.0.1/pbxcore/api/v3","description":"Local MikoPBX instance"}],"paths":{}}')]
    #[ApiResponse(500, 'Failed to generate specification', 'ErrorResponse')]
    #[ResourceSecurity('openapi', ActionType::READ, [SecurityType::PUBLIC])]
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
        summary: 'Get OpenAPI specification (explicit)',
        description: 'Retrieve the complete OpenAPI 3.1 specification for MikoPBX REST API in JSON or YAML format. This is an explicit alias for the main GET endpoint.',
        operationId: 'getOpenAPISpecificationExplicit'
    )]
    #[ApiParameter(
        name: 'format',
        type: 'string',
        description: 'Output format for the specification',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['json', 'yaml'],
        default: 'json',
        example: 'yaml'
    )]
    #[ApiResponse(200, 'OpenAPI specification retrieved successfully')]
    #[ApiResponse(500, 'Failed to generate specification', 'ErrorResponse')]
    #[ResourceSecurity('openapi', ActionType::READ, [SecurityType::PUBLIC])]
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
        summary: 'Get API ACL rules',
        description: 'Extract ACL rules from API attributes for integration with MikoPBX access control system. Returns resource-action mappings and security requirements.',
        operationId: 'getAPIAclRules'
    )]
    #[ApiResponse(200, 'ACL rules retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"resources":{"general_settings":{"actions":["read","write"],"methods":["GET","PUT","PATCH"]},"extensions":{"actions":["read","write","delete"],"methods":["GET","POST","PUT","DELETE"]}},"permissions":["general_settings:read","general_settings:write","extensions:read","extensions:write","extensions:delete"]},"messages":[],"function":"getAclRules","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\OpenAPI\\\\GetAclRulesAction::main","pid":1408}')]
    #[ApiResponse(500, 'Failed to extract ACL rules', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('openapi', ActionType::read)]
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
        summary: 'Get API validation schemas',
        description: 'Extract validation schemas from API attributes for request/response validation. Returns JSON Schema definitions for all documented endpoints.',
        operationId: 'getAPIValidationSchemas'
    )]
    #[ApiResponse(200, 'Validation schemas retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"schemas":{"GeneralSettingsRequest":{"type":"object","properties":{"PBXName":{"type":"string","maxLength":255},"PBXLanguage":{"type":"string","enum":["en","ru","de","es"]}},"required":["PBXName"]},"ExtensionRequest":{"type":"object","properties":{"number":{"type":"string","pattern":"^[0-9]+$"},"name":{"type":"string","maxLength":100}},"required":["number","name"]}}},"messages":[],"function":"getValidationSchemas","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\OpenAPI\\\\GetValidationSchemasAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ApiResponse(500, 'Failed to extract validation schemas', 'ErrorResponse')]
    #[ResourceSecurity('openapi', ActionType::read, [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
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
        summary: 'Clear API metadata cache',
        description: 'Clear cached API metadata to force re-scanning of controllers and regeneration of OpenAPI specification. Useful after API changes or updates.',
        operationId: 'clearOpenAPICache'
    )]
    #[ApiResponse(200, 'Cache cleared successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"message":"API metadata cache cleared successfully"},"messages":["Cache cleared successfully"],"function":"clearCache","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\OpenAPI\\\\ClearCacheAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ApiResponse(500, 'Failed to clear cache', 'ErrorResponse')]
    #[ResourceSecurity('openapi', ActionType::write, [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    public function clearCache(): void
    {
        // Implementation handled by BaseRestController
    }
}
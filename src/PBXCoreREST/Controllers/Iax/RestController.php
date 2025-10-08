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

namespace MikoPBX\PBXCoreREST\Controllers\Iax;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\IaxManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Iax\DataStructure;
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
 * RESTful controller for IAX management (v3 API)
 *
 * IAX (Inter-Asterisk eXchange) protocol management for trunk provider connections.
 * This controller implements custom methods for IAX operations.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Iax
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/iax',
    tags: ['IAX'],
    description: 'IAX (Inter-Asterisk eXchange) protocol management for VoIP trunk provider connections. ' .
                'Provides real-time monitoring of IAX provider registration status, peer connectivity states, ' .
                'and response times for IAX-based SIP trunks.',
    processor: IaxManagementProcessor::class
)]
#[ResourceSecurity('iax', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getRegistry']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['getRegistry'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = IaxManagementProcessor::class;

    /**
     * Indicates this is a singleton resource (no CRUD operations)
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Get IAX providers registry status
     *
     * Returns real-time registration status and connectivity information
     * for all configured IAX providers.
     *
     * @route GET /pbxcore/api/v3/iax:getRegistry
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'registry',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_iax_GetRegistry',
        description: 'rest_iax_GetRegistryDesc',
        operationId: 'getIaxRegistry'
    )]
    #[ApiResponse(200, 'rest_response_200_iax_registry')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRegistry(): void
    {
        // Implementation handled by BaseRestController
    }
}
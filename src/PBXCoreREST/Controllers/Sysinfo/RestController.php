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

namespace MikoPBX\PBXCoreREST\Controllers\Sysinfo;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SysinfoManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiResponse,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for system information (v3 API)
 *
 * Singleton resource providing comprehensive system information and diagnostics.
 * Read-only interface for retrieving hardware, network, and virtualization details.
 * Implements custom methods for various system information aspects.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Sysinfo
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/sysinfo',    
    tags: ['Sysinfo'],
    description: 'rest_Sysinfo_ApiDescription',
    processor: SysinfoManagementProcessor::class
)]
#[ResourceSecurity('sysinfo', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getInfo', 'getExternalIpInfo', 'getHypervisorInfo', 'getDMIInfo']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['getInfo', 'getExternalIpInfo', 'getHypervisorInfo', 'getDMIInfo'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SysinfoManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Get complete system information
     *
     * @route GET /pbxcore/api/v3/sysinfo:getInfo
     */
    #[ApiOperation(
        summary: 'rest_sysinfo_GetInfo',
        description: 'rest_sysinfo_GetInfoDesc',
        operationId: 'getSystemInfo'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getInfo(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get external IP address information
     *
     * @route GET /pbxcore/api/v3/sysinfo:getExternalIpInfo
     */
    #[ApiOperation(
        summary: 'rest_sysinfo_GetExternalIp',
        description: 'rest_sysinfo_GetExternalIpDesc',
        operationId: 'getExternalIpInfo'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getExternalIpInfo(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get hypervisor/virtualization information
     *
     * @route GET /pbxcore/api/v3/sysinfo:getHypervisorInfo
     */
    #[ApiOperation(
        summary: 'rest_sysinfo_GetHypervisor',
        description: 'rest_sysinfo_GetHypervisorDesc',
        operationId: 'getHypervisorInfo'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getHypervisorInfo(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get DMI (Desktop Management Interface) information
     *
     * @route GET /pbxcore/api/v3/sysinfo:getDMIInfo
     */
    #[ApiOperation(
        summary: 'rest_sysinfo_GetDMI',
        description: 'rest_sysinfo_GetDMIDesc',
        operationId: 'getDMIInfo'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDMIInfo(): void
    {
        // Implementation handled by BaseRestController
    }
}
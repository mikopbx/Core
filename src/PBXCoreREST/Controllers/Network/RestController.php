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

namespace MikoPBX\PBXCoreREST\Controllers\Network;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\NetworkManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Network\DataStructure;
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
 * RESTful controller for network configuration management (v3 API)
 *
 * Network configuration management following Google API Design Guide patterns.
 * Implements operations for network interfaces and NAT settings with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Network
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/network',
    tags: ['Network'],
    description: 'Network configuration management for MikoPBX system. ' .
                'Features include network interface management (Ethernet, VLAN), ' .
                'IP address configuration (DHCP, Static), gateway settings, DNS configuration, ' .
                'and NAT/STUN settings for VoIP connectivity.',
    processor: NetworkManagementProcessor::class
)]
#[ResourceSecurity('network', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getConfig', 'getNatSettings'],
        'POST' => ['saveConfig'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'delete'],
    collectionLevelMethods: ['getList'],
    customMethods: ['getConfig', 'saveConfig', 'getNatSettings'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = NetworkManagementProcessor::class;


    /**
     * Get list of all network interfaces
     *
     * @route GET /pbxcore/api/v3/network
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_net_GetList',
        description: 'rest_net_GetListDesc',
        operationId: 'getNetworkInterfacesList'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific network interface by ID
     *
     * @route GET /pbxcore/api/v3/network/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_net_GetRecord',
        description: 'rest_net_GetRecordDesc',
        operationId: 'getNetworkInterfaceById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete a network interface
     *
     * @route DELETE /pbxcore/api/v3/network/{id}
     */
    #[ApiOperation(
        summary: 'rest_net_Delete',
        description: 'rest_net_DeleteDesc',
        operationId: 'deleteNetworkInterface'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class)]
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
     * Get complete network configuration
     *
     * @route GET /pbxcore/api/v3/network:getConfig
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'config'
    )]
    #[ApiOperation(
        summary: 'rest_net_GetConfig',
        description: 'rest_net_GetConfigDesc',
        operationId: 'getNetworkConfiguration'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getConfig(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Save complete network configuration
     *
     * ✨ Uses ApiParameterRef to reference DataStructure definitions - Single Source of Truth
     *
     * @route POST /pbxcore/api/v3/network:saveConfig
     */
    #[ApiOperation(
        summary: 'rest_net_SaveConfig',
        description: 'rest_net_SaveConfigDesc',
        operationId: 'saveNetworkConfiguration'
    )]
    #[ApiParameterRef('interfaces', required: true)]
    #[ApiParameterRef('staticRoutes')]
    #[ApiParameterRef('gateway')]
    #[ApiParameterRef('primarydns')]
    #[ApiParameterRef('secondarydns')]
    #[ApiParameterRef('hostname')]
    #[ApiParameterRef('domain')]
    #[ApiParameterRef('extipaddr')]
    #[ApiParameterRef('exthostname')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function saveConfig(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get NAT settings for VoIP connectivity
     *
     * @route GET /pbxcore/api/v3/network:getNatSettings
     */
    #[ApiOperation(
        summary: 'rest_net_GetNatSettings',
        description: 'rest_net_GetNatSettingsDesc',
        operationId: 'getNetworkNatSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getNatSettings(): void
    {
        // Implementation handled by BaseRestController
    }

}

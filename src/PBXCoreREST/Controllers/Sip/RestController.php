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

namespace MikoPBX\PBXCoreREST\Controllers\Sip;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SIPStackProcessor;
use MikoPBX\PBXCoreREST\Lib\Sip\DataStructure;
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
 * RESTful controller for SIP device status monitoring (v3 API)
 *
 * Provides comprehensive SIP device monitoring and status information.
 * This is a read-only monitoring controller - SIP devices are managed through Extensions controller.
 * Implements custom methods for device status, history, statistics, and registry information.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Sip
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/sip',    
    tags: ['SIP'],
    description: 'rest_Sip_ApiDescription',
    processor: SIPStackProcessor::class
)]
#[ResourceSecurity('sip', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getStatuses', 'getStatus', 'getHistory', 'getStats', 'getPeersStatuses', 'getRegistry', 'getSecret', 'getAuthFailureStats'],
        'POST' => ['forceCheck', 'processAuthFailures', 'clearAuthFailureStats']
    ],
    resourceLevelMethods: ['getStatus', 'getHistory', 'getStats', 'forceCheck', 'getSecret', 'getAuthFailureStats', 'clearAuthFailureStats'],
    collectionLevelMethods: ['getStatuses', 'getPeersStatuses', 'getRegistry', 'processAuthFailures'],
    customMethods: ['getStatuses', 'getStatus', 'getHistory', 'getStats', 'getPeersStatuses', 'getRegistry', 'getSecret', 'forceCheck', 'getAuthFailureStats', 'processAuthFailures', 'clearAuthFailureStats'],
    idPattern: '[0-9A-Za-z_-]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SIPStackProcessor::class;

    /**
     * Get statuses of all SIP devices
     *
     * @route GET /pbxcore/api/v3/sip:getStatuses
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetStatuses',
        description: 'rest_sip_GetStatusesDesc',
        operationId: 'getSipStatuses'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getStatuses(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get status of specific SIP device
     *
     * @route GET /pbxcore/api/v3/sip:getStatus/{extension}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetStatus',
        description: 'rest_sip_GetStatusDesc',
        operationId: 'getSipStatus'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getStatus(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get connection history for SIP device
     *
     * @route GET /pbxcore/api/v3/sip:getHistory/{extension}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'history',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetHistory',
        description: 'rest_sip_GetHistoryDesc',
        operationId: 'getSipHistory'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class, required: false)]
    #[ApiResponse(200, 'rest_response_200_history')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getHistory(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get statistics for SIP device
     *
     * @route GET /pbxcore/api/v3/sip:getStats/{extension}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'stats'
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetStats',
        description: 'rest_sip_GetStatsDesc',
        operationId: 'getSipStats'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_stats')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getStats(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get SIP peers statuses (legacy method)
     *
     * @route GET /pbxcore/api/v3/sip:getPeersStatuses
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetPeersStatuses',
        description: 'rest_sip_GetPeersStatusesDesc',
        operationId: 'getSipPeersStatuses'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getPeersStatuses(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get SIP registry statuses (legacy method)
     *
     * @route GET /pbxcore/api/v3/sip:getRegistry
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'registry',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetRegistry',
        description: 'rest_sip_GetRegistryDesc',
        operationId: 'getSipRegistry'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getRegistry(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get SIP secret for extension
     *
     * @route GET /pbxcore/api/v3/sip:getSecret/{extension}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'secret'
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetSecret',
        description: 'rest_sip_GetSecretDesc',
        operationId: 'getSipSecret'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getSecret(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get authentication failure statistics
     *
     * @route GET /pbxcore/api/v3/sip:getAuthFailureStats/{extension}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'authFailureStats'
    )]
    #[ApiOperation(
        summary: 'rest_sip_GetAuthFailureStats',
        description: 'rest_sip_GetAuthFailureStatsDesc',
        operationId: 'getSipAuthFailureStats'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_stats')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getAuthFailureStats(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Force check of SIP device status
     *
     * @route POST /pbxcore/api/v3/sip:forceCheck/{extension}
     */
    #[ApiOperation(
        summary: 'rest_sip_ForceCheck',
        description: 'rest_sip_ForceCheckDesc',
        operationId: 'forceSipCheck'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_force_check')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function forceCheck(string $extension): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Process authentication failures
     *
     * @route POST /pbxcore/api/v3/sip:processAuthFailures
     */
    #[ApiOperation(
        summary: 'rest_sip_ProcessAuthFailures',
        description: 'rest_sip_ProcessAuthFailuresDesc',
        operationId: 'processSipAuthFailures'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function processAuthFailures(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Clear authentication failure statistics
     *
     * @route POST /pbxcore/api/v3/sip:clearAuthFailureStats/{extension}
     */
    #[ApiOperation(
        summary: 'rest_sip_ClearAuthFailureStats',
        description: 'rest_sip_ClearAuthFailureStatsDesc',
        operationId: 'clearSipAuthFailureStats'
    )]
    #[ApiParameterRef('extension', required: true)]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function clearAuthFailureStats(string $extension): void
    {
        // Implementation handled by BaseRestController
    }
}
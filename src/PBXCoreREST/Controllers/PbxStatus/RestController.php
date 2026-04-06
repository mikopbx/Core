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

namespace MikoPBX\PBXCoreREST\Controllers\PbxStatus;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\PbxStatusManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiResponse,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for PBX Status monitoring (v3 API)
 *
 * Real-time PBX monitoring following Google API Design Guide patterns.
 * Provides access to active calls and channel information.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\PbxStatus
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/pbx-status',
    tags: ['PBX Status'],
    description: 'rest_PbxStatus_ApiDescription',
    processor: PbxStatusManagementProcessor::class
)]
#[ResourceSecurity('pbx_status', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getActiveCalls', 'getActiveChannels']
    ],
    customMethods: ['getActiveCalls', 'getActiveChannels']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = PbxStatusManagementProcessor::class;

    /**
     * Get list of currently active calls
     *
     * @route GET /pbxcore/api/v3/pbx-status:getActiveCalls
     */
    #[ApiOperation(
        summary: 'rest_pbx_status_GetActiveCalls',
        description: 'rest_pbx_status_GetActiveCallsDesc',
        operationId: 'getActiveCalls'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getActiveCalls(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get list of currently active channels
     *
     * @route GET /pbxcore/api/v3/pbx-status:getActiveChannels
     */
    #[ApiOperation(
        summary: 'rest_pbx_status_GetActiveChannels',
        description: 'rest_pbx_status_GetActiveChannelsDesc',
        operationId: 'getActiveChannels'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getActiveChannels(): void
    {
        // Implementation handled by BaseRestController
    }
}

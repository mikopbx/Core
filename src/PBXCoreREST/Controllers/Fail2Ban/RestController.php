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

namespace MikoPBX\PBXCoreREST\Controllers\Fail2Ban;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\Fail2BanManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Fail2Ban\DataStructure;
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
 * RESTful controller for Fail2Ban management (v3 API)
 *
 * Fail2Ban is a singleton resource - there's only one fail2ban configuration in the system.
 * This controller implements standard REST operations without resource IDs.
 *
 * @RoutePrefix("/pbxcore/api/v3/fail2ban")
 *
 * @examples Singleton operations:
 *
 * # Get Fail2Ban settings (singleton GET)
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/fail2ban
 *
 * # Update Fail2Ban settings (singleton PUT)
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/fail2ban \
 *      -H "Content-Type: application/json" \
 *      -d '{"maxretry":5,"bantime":86400,"findtime":1800,"whitelist":"192.168.1.0/24","PBXFirewallMaxReqSec":"100"}'
 *
 * # Partially update settings (singleton PATCH)
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/fail2ban \
 *      -H "Content-Type: application/json" \
 *      -d '{"maxretry":10}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Fail2Ban
 */
#[ApiResource(
    path: '/pbxcore/api/v3/fail2ban',
    tags: ['Fail2Ban'],
    description: 'Comprehensive Fail2Ban intrusion prevention management. Provides singleton REST operations for configuring ban policies, timeouts, and IP whitelists. Automatically blocks malicious IP addresses after detecting repeated failed authentication attempts.',
    processor: Fail2BanManagementProcessor::class
)]
#[ResourceSecurity(
    'fail2ban',
    requirements: [SecurityType::BEARER_TOKEN],
    description: 'rest_security_bearer'
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getRecord'],
        'PUT' => ['update'],
        'PATCH' => ['patch']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getRecord', 'update', 'patch'],
    customMethods: [],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = Fail2BanManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Get Fail2Ban settings (singleton resource)
     *
     * Retrieves the current Fail2Ban configuration including ban policies,
     * timeouts, IP whitelist, and firewall settings.
     *
     * @route GET /pbxcore/api/v3/fail2ban
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_f2b_GetRecord',
        description: 'rest_f2b_GetRecordDesc',
        operationId: 'getFail2BanSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(?string $id = null): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update Fail2Ban settings (singleton resource - full replacement)
     *
     * Replaces the entire Fail2Ban configuration with new values.
     * All fields should be provided for complete configuration.
     *
     * @route PUT /pbxcore/api/v3/fail2ban
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_f2b_Update',
        description: 'rest_f2b_UpdateDesc',
        operationId: 'updateFail2BanSettings'
    )]
    #[ApiParameterRef('maxretry')]
    #[ApiParameterRef('bantime')]
    #[ApiParameterRef('findtime')]
    #[ApiParameterRef('whitelist')]
    #[ApiParameterRef('PBXFirewallMaxReqSec')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function update(?string $id = null): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update Fail2Ban settings (singleton resource)
     *
     * Updates only the specified fields in the Fail2Ban configuration.
     * Other fields remain unchanged. Useful for updating individual settings.
     *
     * @route PATCH /pbxcore/api/v3/fail2ban
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_f2b_Patch',
        description: 'rest_f2b_PatchDesc',
        operationId: 'patchFail2BanSettings'
    )]
    #[ApiParameterRef('maxretry')]
    #[ApiParameterRef('bantime')]
    #[ApiParameterRef('findtime')]
    #[ApiParameterRef('whitelist')]
    #[ApiParameterRef('PBXFirewallMaxReqSec')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function patch(?string $id = null): void
    {
        // Implementation handled by BaseRestController
    }
}

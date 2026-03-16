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

namespace MikoPBX\PBXCoreREST\Controllers\Firewall;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\FirewallManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Firewall\DataStructure;
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
 * RESTful controller for firewall management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/firewall")
 *
 * @examples Standard CRUD operations:
 *
 * # List all firewall rules with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/firewall?limit=20&offset=0"
 *
 * # Get specific firewall rule
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall/1
 *
 * # Create new firewall rule
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall \
 *      -H "Content-Type: application/json" \
 *      -d '{"permit":"192.168.1.0/24","description":"Local network","rules":{"SIP":"allow","WEB":"allow"}}'
 *
 * # Full update (replace) firewall rule
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/firewall/1 \
 *      -H "Content-Type: application/json" \
 *      -d '{"permit":"192.168.1.0/24","description":"Updated network","rules":{"SIP":"block","WEB":"allow"}}'
 *
 * # Partial update (modify) firewall rule
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/firewall/1 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Modified description"}'
 *
 * # Delete firewall rule
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/firewall/1
 *
 * @examples Custom method operations:
 *
 * # Get default values for new firewall rule
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall:getDefault
 *
 * # Get banned IP addresses from fail2ban
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall:getBannedIps
 *
 * # Unban IP address
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:unbanIp \
 *      -H "Content-Type: application/json" \
 *      -d '{"ip":"192.168.1.100"}'
 *
 * # Enable firewall and fail2ban
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:enable
 *
 * # Disable firewall and fail2ban
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:disable
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Firewall
 */
#[ApiResource(
    path: '/pbxcore/api/v3/firewall',    
    tags: ['Firewall'],
    description: 'rest_Firewall_ApiDescription',
    processor: FirewallManagementProcessor::class
)]
#[ResourceSecurity(
    'firewall',
    requirements: [SecurityType::BEARER_TOKEN],
    description: 'rest_security_bearer'
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getBannedIps'],
        'POST' => ['create', 'unbanIp', 'enable', 'disable', 'changePriority'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create', 'getDefault', 'getBannedIps', 'unbanIp', 'enable', 'disable', 'changePriority'],
    customMethods: ['getDefault', 'getBannedIps', 'unbanIp', 'enable', 'disable', 'changePriority'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = FirewallManagementProcessor::class;

    /**
     * Get list of all firewall rules with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/firewall
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_fw_GetList',
        description: 'rest_fw_GetListDesc',
        operationId: 'getFirewallRulesList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: '192.168')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['permit'], example: 'permit')]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific firewall rule by ID
     *
     * @route GET /pbxcore/api/v3/firewall/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_fw_GetRecord',
        description: 'rest_fw_GetRecordDesc',
        operationId: 'getFirewallRuleById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '1')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new firewall rule
     *
     * @route POST /pbxcore/api/v3/firewall
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_fw_Create',
        description: 'rest_fw_CreateDesc',
        operationId: 'createFirewallRule'
    )]
    #[ApiParameterRef('network', required: true)]
    #[ApiParameterRef('subnet', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('rules')]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing firewall rule (full replacement)
     *
     * @route PUT /pbxcore/api/v3/firewall/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_fw_Update',
        description: 'rest_fw_UpdateDesc',
        operationId: 'updateFirewallRule'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '1')]
    #[ApiParameterRef('network', required: true)]
    #[ApiParameterRef('subnet', required: true)]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('rules')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing firewall rule
     *
     * @route PATCH /pbxcore/api/v3/firewall/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_fw_Patch',
        description: 'rest_fw_PatchDesc',
        operationId: 'patchFirewallRule'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '1')]
    #[ApiParameterRef('network')]
    #[ApiParameterRef('subnet')]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('rules')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete a firewall rule
     *
     * @route DELETE /pbxcore/api/v3/firewall/{id}
     */
    #[ApiOperation(
        summary: 'rest_fw_Delete',
        description: 'rest_fw_DeleteDesc',
        operationId: 'deleteFirewallRule'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '1')]
    #[ApiResponse(204, 'rest_response_204_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default values for a new firewall rule
     *
     * @route GET /pbxcore/api/v3/firewall:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_fw_GetDefault',
        description: 'rest_fw_GetDefaultDesc',
        operationId: 'getFirewallRuleDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get list of banned IP addresses from fail2ban with country information
     *
     * Returns a map of IP addresses to their ban details including:
     * - Country ISO code and name (via GeoIP2)
     * - List of bans with jail names and timestamps
     * - Ban and unban times in UNIX timestamp format
     *
     * @route GET /pbxcore/api/v3/firewall:getBannedIps
     */
    #[ApiOperation(
        summary: 'rest_fw_GetBannedIps',
        description: 'rest_fw_GetBannedIpsDesc',
        operationId: 'getBannedIpAddresses'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'rest_response_200_banned_ips',
        content: [
            'application/json' => [
                'schema' => [
                    'type' => 'object',
                    'description' => 'rest_schema_banned_ip_map',
                    'additionalProperties' => [
                        'type' => 'object',
                        'required' => ['country', 'countryName', 'bans'],
                        'properties' => [
                            'country' => [
                                'type' => 'string',
                                'description' => 'rest_schema_banned_ip_country',
                                'pattern' => '^[A-Z]{2}$|^$',
                                'example' => 'US'
                            ],
                            'countryName' => [
                                'type' => 'string',
                                'description' => 'rest_schema_banned_ip_country_name',
                                'example' => 'United States'
                            ],
                            'bans' => [
                                'type' => 'array',
                                'description' => 'rest_schema_banned_ip_bans',
                                'items' => [
                                    'type' => 'object',
                                    'required' => ['jail', 'timeofban', 'timeunban', 'v'],
                                    'properties' => [
                                        'jail' => [
                                            'type' => 'string',
                                            'description' => 'rest_schema_banned_ip_jail',
                                            'example' => 'asterisk-security_v2'
                                        ],
                                        'timeofban' => [
                                            'type' => 'integer',
                                            'description' => 'rest_schema_banned_ip_timeofban',
                                            'minimum' => 0,
                                            'example' => 1704067200
                                        ],
                                        'timeunban' => [
                                            'type' => 'integer',
                                            'description' => 'rest_schema_banned_ip_timeunban',
                                            'minimum' => 0,
                                            'example' => 1704153600
                                        ],
                                        'v' => [
                                            'type' => 'string',
                                            'description' => 'rest_schema_banned_ip_version',
                                            'enum' => ['2'],
                                            'example' => '2'
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'example' => [
                        '192.168.1.100' => [
                            'country' => 'US',
                            'countryName' => 'United States',
                            'bans' => [
                                [
                                    'jail' => 'asterisk-security_v2',
                                    'timeofban' => 1704067200,
                                    'timeunban' => 1704153600,
                                    'v' => '2'
                                ]
                            ]
                        ],
                        '10.0.0.50' => [
                            'country' => 'RU',
                            'countryName' => 'Russia',
                            'bans' => [
                                [
                                    'jail' => 'asterisk-security_v2',
                                    'timeofban' => 1704070800,
                                    'timeunban' => 1704157200,
                                    'v' => '2'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]
    )]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getBannedIps(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Unban a specific IP address
     *
     * @route POST /pbxcore/api/v3/firewall:unbanIp
     */
    #[ApiOperation(
        summary: 'rest_fw_UnbanIp',
        description: 'rest_fw_UnbanIpDesc',
        operationId: 'unbanIpAddress'
    )]
    #[ApiParameterRef('ip', required: true)]
    #[ApiResponse(200, 'rest_response_200_unbanned')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function unbanIp(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Enable firewall and fail2ban protection
     *
     * @route POST /pbxcore/api/v3/firewall:enable
     */
    #[ApiOperation(
        summary: 'rest_fw_Enable',
        description: 'rest_fw_EnableDesc',
        operationId: 'enableFirewall'
    )]
    #[ApiResponse(200, 'rest_response_200_enabled')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function enable(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Disable firewall and fail2ban protection
     *
     * @route POST /pbxcore/api/v3/firewall:disable
     */
    #[ApiOperation(
        summary: 'rest_fw_Disable',
        description: 'rest_fw_DisableDesc',
        operationId: 'disableFirewall'
    )]
    #[ApiResponse(200, 'rest_response_200_disabled')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function disable(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Change priority order of firewall network filter rules
     *
     * @route POST /pbxcore/api/v3/firewall:changePriority
     */
    #[ApiOperation(
        summary: 'rest_fw_ChangePriority',
        description: 'rest_fw_ChangePriorityDesc',
        operationId: 'changeFirewallRulePriority'
    )]
    #[ApiResponse(200, 'rest_response_200_priority_changed')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function changePriority(): void
    {
        // Implementation handled by BaseRestController
    }
}

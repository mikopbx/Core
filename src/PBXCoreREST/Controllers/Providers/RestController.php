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

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Attributes\ApiDataSchema;
use MikoPBX\PBXCoreREST\Attributes\ApiOperation;
use MikoPBX\PBXCoreREST\Attributes\ApiParameter;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use MikoPBX\PBXCoreREST\Attributes\ApiResponse;
use MikoPBX\PBXCoreREST\Attributes\HttpMapping;
use MikoPBX\PBXCoreREST\Attributes\ParameterLocation;
use MikoPBX\PBXCoreREST\Attributes\ResourceSecurity;
use MikoPBX\PBXCoreREST\Attributes\SecurityType;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Providers\DataStructure;

/**
 * READ-ONLY RESTful controller for providers listing (v3 API)
 *
 * This controller provides read-only access to both SIP and IAX providers.
 * For create/update/delete operations, use type-specific endpoints:
 * - /api/v3/sip-providers for SIP providers
 * - /api/v3/iax-providers for IAX providers
 */
#[ApiResource(
    path: '/pbxcore/api/v3/providers',
    tags: ['Providers'],
    description: 'Comprehensive VoIP provider management for listing and monitoring both SIP and IAX providers. This read-only endpoint provides unified access to all provider types. For create/update/delete operations, use type-specific endpoints: /api/v3/sip-providers or /api/v3/iax-providers. Providers are identified by unique identifiers (PROV-XXX format) and can be filtered by type, status, or registration state. Supports real-time status monitoring, historical data retrieval, and statistics tracking.',
    processor: ProvidersManagementProcessor::class
)]
#[ResourceSecurity('providers', requirements: [SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getForSelect', 'getStatuses', 'getStatus', 'getHistory', 'getStats'],
        'POST' => ['updateStatus']
    ],
    resourceLevelMethods: ['getStatus', 'getHistory', 'getStats', 'updateStatus'],
    collectionLevelMethods: ['getForSelect', 'getStatuses'],
    customMethods: ['getForSelect', 'getStatuses', 'getStatus', 'getHistory', 'getStats', 'updateStatus'],
    idPattern: ['SIP-', 'IAX-', 'SIP-PROVIDER-', 'IAX-PROVIDER-']  // Modern: SIP-xxx / IAX-xxx, Legacy: SIP-PROVIDER-xxx / IAX-PROVIDER-xxx
)]
class RestController extends BaseRestController
{
    protected string $processorClass = ProvidersManagementProcessor::class;

    // ============================================================================
    // Standard READ Operations (inherited from BaseRestController)
    // ============================================================================

    /**
     * Get paginated list of all providers (both SIP and IAX)
     *
     * Returns a list of all VoIP providers with pagination support and optional filtering.
     * Includes basic provider information, type, status, and registration details.
     * For write operations, use type-specific endpoints: /api/v3/sip-providers or /api/v3/iax-providers.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetList',
        description: 'rest_pvd_GetListDesc',
        operationId: 'listProviders'
    )]
    #[ApiParameter('limit', 'integer', 'rest_param_pagination_limit', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 100, default: 20)]
    #[ApiParameter('offset', 'integer', 'rest_param_pagination_offset', ParameterLocation::QUERY, required: false, minimum: 0, default: 0)]
    #[ApiParameter('type', 'string', 'rest_param_pvd_type', ParameterLocation::QUERY, required: false, enum: ['SIP', 'IAX'])]
    #[ApiParameter('registered', 'boolean', 'rest_param_pvd_registered', ParameterLocation::QUERY, required: false)]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider list',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'data' => [
                    'type' => 'object',
                    'properties' => [
                        'providers' => [
                            'type' => 'array',
                            'items' => ['$ref' => '#/components/schemas/Provider']
                        ],
                        'total' => ['type' => 'integer', 'example' => 100],
                        'limit' => ['type' => 'integer', 'example' => 20],
                        'offset' => ['type' => 'integer', 'example' => 0]
                    ]
                ]
            ]
        ]
            ]
        ]
    )]
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    public function getList(): void
    {
        parent::handleCRUDRequest();
    }

    /**
     * Get single provider by ID
     *
     * Returns detailed information about a specific provider identified by its unique ID.
     * Provider type (SIP or IAX) is determined automatically based on the ID.
     * For write operations, use type-specific endpoints.
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_pvd_GetRecord',
        description: 'rest_pvd_GetRecordDesc',
        operationId: 'getProvider'
    )]
    #[ApiParameter('id', 'string', 'rest_param_pvd_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'PROV-SIP-123')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider details',
        schema: '#/components/schemas/Provider'
    )]
    #[ApiResponse(statusCode: 404, description: 'Provider not found')]
    public function getRecord(string $id): void
    {
        parent::handleCRUDRequest($id);
    }

    // ============================================================================
    // Custom READ Operations (collection-level)
    // ============================================================================

    /**
     * Get providers for dropdown select
     *
     * Returns a simplified list of providers optimized for dropdown/select UI components.
     * Each provider includes only essential information: ID, name/description, and type.
     * Can be filtered by provider type.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetForSelect',
        description: 'rest_pvd_GetForSelectDesc',
        operationId: 'getProvidersForSelect'
    )]
    #[ApiParameter('type', 'string', 'rest_param_pvd_type', ParameterLocation::QUERY, required: false, enum: ['SIP', 'IAX'])]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider options',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'data' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'string', 'example' => 'PROV-SIP-123'],
                            'name' => ['type' => 'string', 'example' => 'Main SIP Trunk'],
                            'type' => ['type' => 'string', 'enum' => ['SIP', 'IAX']]
                        ]
                    ]
                ]
            ]
        ]
            ]
        ]
    )]
    public function getForSelect(): void
    {
        // Implemented by processor
    }

    /**
     * Get all provider statuses
     *
     * Returns current registration and operational status for all providers.
     * Includes real-time information about registration state, call statistics,
     * and health indicators. Useful for monitoring dashboards and system health checks.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetStatuses',
        description: 'rest_pvd_GetStatusesDesc',
        operationId: 'getProviderStatuses'
    )]
    #[ApiParameter('type', 'string', 'rest_param_pvd_type', ParameterLocation::QUERY, required: false, enum: ['SIP', 'IAX'])]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with all provider statuses',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'data' => [
                    'type' => 'array',
                    'items' => ['$ref' => '#/components/schemas/ProviderStatus']
                ]
            ]
        ]
            ]
        ]
    )]
    public function getStatuses(): void
    {
        // Implemented by processor
    }

    // ============================================================================
    // Custom READ Operations (resource-level)
    // ============================================================================

    /**
     * Get specific provider status
     *
     * Returns detailed real-time status information for a single provider.
     * Includes registration state, IP address, port, latency, and active channels.
     * Updates are retrieved from the live Asterisk system.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetStatus',
        description: 'rest_pvd_GetStatusDesc',
        operationId: 'getProviderStatus'
    )]
    #[ApiParameter('id', 'string', 'rest_param_pvd_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'PROV-SIP-123')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider status',
        schema: '#/components/schemas/ProviderStatus'
    )]
    #[ApiResponse(statusCode: 404, description: 'Provider not found')]
    public function getStatus(string $id): void
    {
        // Implemented by processor
    }

    /**
     * Get provider history
     *
     * Returns historical data for a provider including registration events,
     * connection failures, and status changes over time.
     * Useful for troubleshooting connectivity issues and analyzing provider reliability.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetHistory',
        description: 'rest_pvd_GetHistoryDesc',
        operationId: 'getProviderHistory'
    )]
    #[ApiParameter('id', 'string', 'rest_param_pvd_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'PROV-SIP-123')]
    #[ApiParameter('from', 'string', 'rest_param_pvd_from', ParameterLocation::QUERY, required: false, format: 'date-time', example: '2025-10-01T00:00:00Z')]
    #[ApiParameter('to', 'string', 'rest_param_pvd_to', ParameterLocation::QUERY, required: false, format: 'date-time', example: '2025-10-08T23:59:59Z')]
    #[ApiParameter('limit', 'integer', 'rest_param_pagination_limit', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 1000, default: 100)]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider history',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'data' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'timestamp' => ['type' => 'string', 'example' => '2025-10-08T10:30:00Z'],
                            'event' => ['type' => 'string', 'example' => 'Registered'],
                            'details' => ['type' => 'string', 'example' => 'Registration successful']
                        ]
                    ]
                ]
            ]
        ]
            ]
        ]
    )]
    #[ApiResponse(statusCode: 404, description: 'Provider not found')]
    public function getHistory(string $id): void
    {
        // Implemented by processor
    }

    /**
     * Get provider statistics
     *
     * Returns statistical information about provider usage including total calls,
     * call duration, successful/failed call counts, and average call quality metrics.
     * Statistics can be filtered by time range.
     */
    #[ApiOperation(
        summary: 'rest_pvd_GetStats',
        description: 'rest_pvd_GetStatsDesc',
        operationId: 'getProviderStats'
    )]
    #[ApiParameter('id', 'string', 'rest_param_pvd_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'PROV-SIP-123')]
    #[ApiParameter('from', 'string', 'rest_param_pvd_from', ParameterLocation::QUERY, required: false, format: 'date-time', example: '2025-10-01T00:00:00Z')]
    #[ApiParameter('to', 'string', 'rest_param_pvd_to', ParameterLocation::QUERY, required: false, format: 'date-time', example: '2025-10-08T23:59:59Z')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with provider statistics',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'data' => [
                    'type' => 'object',
                    'properties' => [
                        'totalCalls' => ['type' => 'integer', 'example' => 1523],
                        'successfulCalls' => ['type' => 'integer', 'example' => 1498],
                        'failedCalls' => ['type' => 'integer', 'example' => 25],
                        'totalDuration' => ['type' => 'integer', 'description' => 'Total call duration in seconds', 'example' => 45620],
                        'averageDuration' => ['type' => 'number', 'description' => 'Average call duration in seconds', 'example' => 30.45]
                    ]
                ]
            ]
        ]
            ]
        ]
    )]
    #[ApiResponse(statusCode: 404, description: 'Provider not found')]
    public function getStats(string $id): void
    {
        // Implemented by processor
    }

    // ============================================================================
    // Custom WRITE Operations
    // ============================================================================

    /**
     * Update provider status
     *
     * Manually trigger provider registration/unregistration or update operational status.
     * This is useful for testing connectivity or forcing re-registration without restarting Asterisk.
     */
    #[ApiOperation(
        summary: 'rest_pvd_UpdateStatus',
        description: 'rest_pvd_UpdateStatusDesc',
        operationId: 'updateProviderStatus'
    )]
    #[ApiParameter('id', 'string', 'rest_param_pvd_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'PROV-SIP-123')]
    #[ApiParameter('action', 'string', 'rest_param_pvd_action', ParameterLocation::QUERY, required: true, enum: ['register', 'unregister', 'refresh'], example: 'register')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Status update initiated successfully',
        content: [
            'application/json' => [
                'schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean', 'example' => true],
                'message' => ['type' => 'string', 'example' => 'Registration initiated']
            ]
        ]
            ]
        ]
    )]
    #[ApiResponse(statusCode: 404, description: 'Provider not found')]
    public function updateStatus(string $id): void
    {
        // Implemented by processor
    }

    /**
     * Define allowed custom methods for each HTTP method
     * Only read operations are allowed
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getForSelect', 'getStatuses', 'getStatus', 'getHistory', 'getStats'],
            'POST' => ['updateStatus']
        ];
    }

    /**
     * Override action mapping to allow only read operations
     * Write operations return error
     *
     * @return array<string, array<string, string|null>>
     */
    protected function getActionMapping(): array
    {
        return [
            'GET' => [
                'collection' => 'getList',
                'resource' => 'getRecord'
            ],
            'POST' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'PUT' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'PATCH' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'DELETE' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ]
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        // Resource-level methods that require an ID
        $resourceMethods = ['getStatus', 'getHistory', 'getStats', 'updateStatus'];

        return in_array($method, $resourceMethods, true) || parent::isResourceLevelMethod($method);
    }

    /**
     * Override handleCRUDRequest to provide better error messages for write operations
     *
     * @param string|null $id Resource ID for single resource operations
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        $httpMethod = $this->request->getMethod();

        // Block write operations with helpful message
        if (in_array($httpMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $this->sendErrorResponse(
                "Write operations are not supported on /api/v3/providers. " .
                "Please use type-specific endpoints: " .
                "/api/v3/sip-providers for SIP providers or /api/v3/iax-providers for IAX providers.",
                405
            );
            return;
        }

        // Allow read operations
        parent::handleCRUDRequest($id);
    }
}

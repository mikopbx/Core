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

namespace MikoPBX\PBXCoreREST\Controllers\IaxProviders;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Providers\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for IAX providers management (v3 API)
 *
 * Comprehensive IAX providers management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\IaxProviders
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/iax-providers',
    tags: ['IAX Providers'],
    description: 'Comprehensive IAX provider management for Internet Asterisk eXchange (IAX) protocol trunking. ' .
                'IAX is a VoIP protocol designed for efficient trunk connections between Asterisk servers. ' .
                'Features include provider registration, status monitoring, connection testing, and statistics tracking.',
    processor: ProvidersManagementProcessor::class
)]
#[ResourceSecurity('iax_providers', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getStatuses', 'getStatus', 'getHistory', 'getStats', 'copy'],
        'POST' => ['create', 'forceCheck', 'updateStatus'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'getStatus', 'forceCheck', 'updateStatus', 'copy'],
    collectionLevelMethods: ['getList', 'create', 'getStatuses', 'getHistory', 'getStats'],
    customMethods: ['getDefault', 'getStatuses', 'getStatus', 'getHistory', 'getStats', 'copy', 'forceCheck', 'updateStatus'],
    idPattern: ['IAX-', 'IAX-PROVIDER-', 'IAX-TRUNK-']  // Modern: IAX-TRUNK-xxx, Legacy: IAX-PROVIDER-xxx, IAX-xxx 
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ProvidersManagementProcessor::class;
    
    /**
     * Provider type for this controller
     * @var string
     */
    protected string $providerType = 'IAX';


    /**
     * Get list of all IAX providers with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/iax-providers
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_GetList',
        description: 'rest_iaxp_GetListDesc',
        operationId: 'getIaxProvidersList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'main')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['description', 'host', 'disabled'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific IAX provider by ID
     *
     * @route GET /pbxcore/api/v3/iax-providers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_GetRecord',
        description: 'rest_iaxp_GetRecordDesc',
        operationId: 'getIaxProviderById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new IAX provider
     *
     * @route POST /pbxcore/api/v3/iax-providers
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_Create',
        description: 'rest_iaxp_CreateDesc',
        operationId: 'createIaxProvider'
    )]
    #[ApiParameter('description', 'string', 'rest_param_prov_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Main IAX Provider')]
    #[ApiParameter('host', 'string', 'rest_param_prov_host', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'iax.provider.com')]
    #[ApiParameter('username', 'string', 'rest_param_prov_username', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'user123')]
    #[ApiParameter('secret', 'string', 'rest_param_prov_secret', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'SecurePass123')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_prov_disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing IAX provider (full replacement)
     *
     * @route PUT /pbxcore/api/v3/iax-providers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_Update',
        description: 'rest_iaxp_UpdateDesc',
        operationId: 'updateIaxProvider'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiParameter('description', 'string', 'rest_param_prov_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Updated IAX Provider')]
    #[ApiParameter('host', 'string', 'rest_param_prov_host', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'new.iax.provider.com')]
    #[ApiParameter('username', 'string', 'rest_param_prov_username', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'newuser')]
    #[ApiParameter('secret', 'string', 'rest_param_prov_secret', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'NewPass456')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_prov_disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing IAX provider
     *
     * @route PATCH /pbxcore/api/v3/iax-providers/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_Patch',
        description: 'rest_iaxp_PatchDesc',
        operationId: 'patchIaxProvider'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiParameter('description', 'string', 'rest_param_prov_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Patched description')]
    #[ApiParameter('host', 'string', 'rest_param_prov_host', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'patched.provider.com')]
    #[ApiParameter('username', 'string', 'rest_param_prov_username', ParameterLocation::QUERY, required: false, maxLength: 100, example: 'patcheduser')]
    #[ApiParameter('secret', 'string', 'rest_param_prov_secret', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'PatchedPass')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_prov_disabled', ParameterLocation::QUERY, required: false, example: true)]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete an IAX provider
     *
     * @route DELETE /pbxcore/api/v3/iax-providers/{id}
     */
    #[ApiOperation(
        summary: 'rest_iaxp_Delete',
        description: 'rest_iaxp_DeleteDesc',
        operationId: 'deleteIaxProvider'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
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
     * Get default template for new IAX provider
     *
     * @route GET /pbxcore/api/v3/iax-providers:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_GetDefault',
        description: 'rest_iaxp_GetDefaultDesc',
        operationId: 'getIaxProviderDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get registration statuses for all IAX providers
     *
     * @route GET /pbxcore/api/v3/iax-providers:getStatuses
     */
    #[ApiOperation(
        summary: 'rest_iaxp_GetStatuses',
        description: 'rest_iaxp_GetStatusesDesc',
        operationId: 'getIaxProvidersStatuses'
    )]
    #[ApiResponse(200, 'rest_response_200_statuses')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getStatuses(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get registration status for specific IAX provider
     *
     * @route GET /pbxcore/api/v3/iax-providers/{id}:getStatus
     */
    #[ApiOperation(
        summary: 'rest_iaxp_GetStatus',
        description: 'rest_iaxp_GetStatusDesc',
        operationId: 'getIaxProviderStatus'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiResponse(200, 'rest_response_200_status')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getStatus(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get connection history for all IAX providers
     *
     * @route GET /pbxcore/api/v3/iax-providers:getHistory
     */
    #[ApiOperation(
        summary: 'rest_iaxp_GetHistory',
        description: 'rest_iaxp_GetHistoryDesc',
        operationId: 'getIaxProvidersHistory'
    )]
    #[ApiParameter(
        name: 'dateFrom',
        type: 'string',
        description: 'rest_param_dateFrom',
        in: ParameterLocation::QUERY,
        format: 'date-time',
        example: '2025-01-01T00:00:00'
    )]
    #[ApiParameter(
        name: 'dateTo',
        type: 'string',
        description: 'rest_param_dateTo',
        in: ParameterLocation::QUERY,
        format: 'date-time',
        example: '2025-01-31T23:59:59'
    )]
    #[ApiResponse(200, 'rest_response_200_history')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getHistory(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get statistics for all IAX providers
     *
     * @route GET /pbxcore/api/v3/iax-providers:getStats
     */
    #[ApiOperation(
        summary: 'rest_iaxp_GetStats',
        description: 'rest_iaxp_GetStatsDesc',
        operationId: 'getIaxProvidersStats'
    )]
    #[ApiResponse(200, 'rest_response_200_stats')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getStats(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing IAX provider with a new description
     *
     * @route GET /pbxcore/api/v3/iax-providers/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_iaxp_Copy',
        description: 'rest_iaxp_CopyDesc',
        operationId: 'copyIaxProvider'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiParameter('description', 'string', 'rest_param_prov_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Copy of Main Provider')]
    #[ApiResponse(201, 'rest_response_201_copied')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Force registration check for specific IAX provider
     *
     * @route POST /pbxcore/api/v3/iax-providers/{id}:forceCheck
     */
    #[ApiOperation(
        summary: 'rest_iaxp_ForceCheck',
        description: 'rest_iaxp_ForceCheckDesc',
        operationId: 'forceCheckIaxProvider'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiResponse(200, 'rest_response_200_force_check')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function forceCheck(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update provider status (enable/disable)
     *
     * @route POST /pbxcore/api/v3/iax-providers/{id}:updateStatus
     */
    #[ApiOperation(
        summary: 'rest_iaxp_UpdateStatus',
        description: 'rest_iaxp_UpdateStatusDesc',
        operationId: 'updateIaxProviderStatus'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z0-9_-]+$', example: 'IAX-PROV-123')]
    #[ApiParameter('disabled', 'boolean', 'rest_param_prov_disabled', ParameterLocation::QUERY, required: true, example: false)]
    #[ApiResponse(200, 'rest_response_200_status_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function updateStatus(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Override sendRequestToBackendWorker to force IAX type
     * 
     * @param string $processor The name of the processor.
     * @param string $actionName The name of the action.
     * @param mixed|null $payload The payload data to send with the request.
     * @param string $moduleName The name of the module (only for 'modules' processor).
     * @param int $maxTimeout The maximum timeout for the request in seconds.
     * @param int $priority The priority of the request.
     * @return void
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        mixed $payload = null,
        string $moduleName = '',
        int $maxTimeout = 30,
        int $priority = 0
    ): void {
        // Force IAX type for all operations
        if (is_array($payload)) {
            $payload['type'] = $this->providerType;
        }
        
        parent::sendRequestToBackendWorker($processor, $actionName, $payload, $moduleName, $maxTimeout, $priority);
    }
}
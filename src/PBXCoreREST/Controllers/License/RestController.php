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

namespace MikoPBX\PBXCoreREST\Controllers\License;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\License\DataStructure;
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
 * RESTful controller for license management (v3 API)
 *
 * License management following singleton resource pattern.
 * Implements custom methods for license operations with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\License
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/license',    
    tags: ['Licensing'],
    description: 'License management for MikoPBX system. ' .
                'Features include license activation, validation, key management, ' .
                'feature capture for products, metrics reporting, and license server connectivity checks.',
    processor: LicenseManagementProcessor::class
)]
#[ResourceSecurity('license', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getLicenseInfo', 'ping', 'sendPBXMetrics', 'resetKey'],
        'POST' => ['processUserRequest', 'captureFeatureForProductId']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['getLicenseInfo', 'ping', 'sendPBXMetrics', 'resetKey', 'processUserRequest', 'captureFeatureForProductId'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = LicenseManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;


    /**
     * Get current license information
     *
     * @route GET /pbxcore/api/v3/license:getLicenseInfo
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_GetLicenseInfo',
        description: 'rest_lic_GetLicenseInfoDesc',
        operationId: 'getLicenseInfo'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getLicenseInfo(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check connection with license server
     *
     * @route GET /pbxcore/api/v3/license:ping
     */
    #[ApiOperation(
        summary: 'rest_lic_Ping',
        description: 'rest_lic_PingDesc',
        operationId: 'pingLicenseServer'
    )]
    #[ApiResponse(200, 'rest_response_200_test')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function ping(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Send PBX metrics to license server
     *
     * @route GET /pbxcore/api/v3/license:sendPBXMetrics
     */
    #[ApiOperation(
        summary: 'rest_lic_SendPBXMetrics',
        description: 'rest_lic_SendPBXMetricsDesc',
        operationId: 'sendPBXMetrics'
    )]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function sendPBXMetrics(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Reset license key
     *
     * @route GET /pbxcore/api/v3/license:resetKey
     */
    #[ApiOperation(
        summary: 'rest_lic_ResetKey',
        description: 'rest_lic_ResetKeyDesc',
        operationId: 'resetLicenseKey'
    )]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function resetKey(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Process user license request (update key, activate coupon)
     *
     * @route POST /pbxcore/api/v3/license:processUserRequest
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_ProcessUserRequest',
        description: 'rest_lic_ProcessUserRequestDesc',
        operationId: 'processUserLicenseRequest'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('licKey')]
    #[ApiParameterRef('coupon')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function processUserRequest(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Capture feature for product
     *
     * @route POST /pbxcore/api/v3/license:captureFeatureForProductId
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_CaptureFeature',
        description: 'rest_lic_CaptureFeatureDesc',
        operationId: 'captureFeatureForProduct'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('productId', required: true)]
    #[ApiParameterRef('featureId', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function captureFeatureForProductId(): void
    {
        // Implementation handled by BaseRestController
    }

}

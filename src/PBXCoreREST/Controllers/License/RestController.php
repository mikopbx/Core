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
    description: 'rest_License_ApiDescription',
    processor: LicenseManagementProcessor::class
)]
#[ResourceSecurity('license', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getLicenseInfo', 'ping', 'sendPBXMetrics', 'resetKey', 'featureAvailable', 'usageGet'],
        'POST' => ['processUserRequest', 'captureFeatureForProductId', 'sessionStart', 'captureFeature',
            'sessionKeepalive', 'releaseFeature', 'sessionEnd', 'entitlementExport', 'entitlementImport']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['getLicenseInfo', 'ping', 'sendPBXMetrics', 'resetKey', 'processUserRequest',
        'captureFeatureForProductId', 'sessionStart', 'captureFeature', 'sessionKeepalive', 'releaseFeature',
        'sessionEnd', 'featureAvailable', 'usageGet', 'entitlementExport', 'entitlementImport'],
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

    /**
     * Open a seat session for one device (licensing server name: session.start)
     *
     * @route POST /pbxcore/api/v3/license:sessionStart
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_SessionStart',
        description: 'rest_lic_SessionStartDesc',
        operationId: 'licenseSessionStart'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('holder')]
    #[ApiParameterRef('ttl')]
    #[ApiResponse(200, 'rest_response_200_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function sessionStart(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Capture one seat of a feature for a session (licensing server name: capture.feature)
     *
     * @route POST /pbxcore/api/v3/license:captureFeature
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_CaptureSeat',
        description: 'rest_lic_CaptureSeatDesc',
        operationId: 'licenseCaptureFeature'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('sessionId', required: true)]
    #[ApiParameterRef('featureId', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function captureFeature(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Renew the seat lease and re-check the rights (licensing server name: session.keepalive)
     *
     * @route POST /pbxcore/api/v3/license:sessionKeepalive
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_SessionKeepalive',
        description: 'rest_lic_SessionKeepaliveDesc',
        operationId: 'licenseSessionKeepalive'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('sessionId', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function sessionKeepalive(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Release one seat of a feature (licensing server name: release.feature)
     *
     * @route POST /pbxcore/api/v3/license:releaseFeature
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_ReleaseFeature',
        description: 'rest_lic_ReleaseFeatureDesc',
        operationId: 'licenseReleaseFeature'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('featureId', required: true)]
    #[ApiParameterRef('sessionId')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function releaseFeature(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Close the session and release all its seats (licensing server name: session.end)
     *
     * @route POST /pbxcore/api/v3/license:sessionEnd
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_SessionEnd',
        description: 'rest_lic_SessionEndDesc',
        operationId: 'licenseSessionEnd'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('sessionId', required: true)]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function sessionEnd(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check a feature against the local entitlement document (licensing server name: feature.available)
     *
     * @route GET /pbxcore/api/v3/license:featureAvailable
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_FeatureAvailable',
        description: 'rest_lic_FeatureAvailableDesc',
        operationId: 'licenseFeatureAvailable'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('featureId', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function featureAvailable(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Seats taken and the limit of every feature (licensing server name: usage.get)
     *
     * @route GET /pbxcore/api/v3/license:usageGet
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_UsageGet',
        description: 'rest_lic_UsageGetDesc',
        operationId: 'licenseUsageGet'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function usageGet(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Export the signed request file for a closed contour (licensing server name: entitlement.export)
     *
     * @route POST /pbxcore/api/v3/license:entitlementExport
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_EntitlementExport',
        description: 'rest_lic_EntitlementExportDesc',
        operationId: 'licenseEntitlementExport'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function entitlementExport(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Import the entitlement document issued by the cabinet (licensing server name: entitlement.import)
     *
     * @route POST /pbxcore/api/v3/license:entitlementImport
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_lic_EntitlementImport',
        description: 'rest_lic_EntitlementImportDesc',
        operationId: 'licenseEntitlementImport'
    )]
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    #[ApiParameterRef('token', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(501, 'rest_response_501_not_implemented', 'PBXApiResult')]
    public function entitlementImport(): void
    {
        // Implementation handled by BaseRestController
    }
}

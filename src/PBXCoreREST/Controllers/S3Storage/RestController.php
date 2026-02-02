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

namespace MikoPBX\PBXCoreREST\Controllers\S3Storage;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\S3ManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\S3Storage\DataStructure;
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
 * RESTful controller for S3 storage management (v3 API)
 *
 * S3 Storage is a singleton resource for managing S3-compatible storage
 * configuration. Supports AWS S3, MinIO, Wasabi, and other S3-compatible services.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\S3Storage
 */
#[ApiResource(
    path: '/pbxcore/api/v3/s3-storage',
    tags: ['S3 Storage'],
    description: 'rest_S3Storage_ApiDescription',
    processor: S3ManagementProcessor::class
)]
#[ResourceSecurity('storage_s3', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getRecord', 'testConnection', 'stats'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'POST' => ['testConnection']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getRecord', 'update', 'patch', 'testConnection', 'stats'],
    customMethods: ['testConnection', 'stats'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = S3ManagementProcessor::class;


    /**
     * Get S3 storage configuration (singleton)
     *
     * @route GET /pbxcore/api/v3/s3-storage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_s3_GetRecord',
        description: 'rest_s3_GetRecordDesc',
        operationId: 'getS3StorageConfig'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getRecord(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update S3 storage configuration (full replacement)
     *
     * @route PUT /pbxcore/api/v3/s3-storage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_s3_Update',
        description: 'rest_s3_UpdateDesc',
        operationId: 'updateS3StorageConfig'
    )]
    #[ApiParameterRef('s3_enabled', required: true)]
    #[ApiParameterRef('s3_endpoint', required: false)]
    #[ApiParameterRef('s3_region', required: false)]
    #[ApiParameterRef('s3_bucket', required: false)]
    #[ApiParameterRef('s3_access_key', required: false)]
    #[ApiParameterRef('s3_secret_key', required: false)]
    #[ApiParameterRef('PBX_RECORD_SAVE_PERIOD', required: false)]
    #[ApiParameterRef('PBX_RECORD_S3_LOCAL_DAYS', required: false)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation_error', 'PBXApiResult')]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update S3 storage configuration
     *
     * @route PATCH /pbxcore/api/v3/s3-storage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_s3_Patch',
        description: 'rest_s3_PatchDesc',
        operationId: 'patchS3StorageConfig'
    )]
    #[ApiParameterRef('s3_enabled')]
    #[ApiParameterRef('s3_endpoint')]
    #[ApiParameterRef('s3_region')]
    #[ApiParameterRef('s3_bucket')]
    #[ApiParameterRef('s3_access_key')]
    #[ApiParameterRef('s3_secret_key')]
    #[ApiParameterRef('PBX_RECORD_SAVE_PERIOD')]
    #[ApiParameterRef('PBX_RECORD_S3_LOCAL_DAYS')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation_error', 'PBXApiResult')]
    public function patch(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Test S3 connection and credentials
     *
     * @route GET /pbxcore/api/v3/s3-storage:testConnection
     * @route POST /pbxcore/api/v3/s3-storage:testConnection
     */
    #[ApiOperation(
        summary: 'rest_s3_TestConnection',
        description: 'rest_s3_TestConnectionDesc',
        operationId: 'testS3Connection'
    )]
    #[ApiParameterRef('s3_endpoint', required: true)]
    #[ApiParameterRef('s3_region')]
    #[ApiParameterRef('s3_bucket', required: true)]
    #[ApiParameterRef('s3_access_key', required: true)]
    #[ApiParameterRef('s3_secret_key', required: true)]
    #[ApiResponse(200, 'rest_response_200_test')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function testConnection(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get S3 synchronization statistics
     *
     * Returns detailed statistics about S3 storage synchronization including:
     * - Number of files in S3 and locally
     * - Total size in S3 and pending upload
     * - Sync percentage and status (synced/syncing/pending/disabled)
     * - Last upload timestamp and oldest pending file date
     * - S3 connection status
     *
     * @route GET /pbxcore/api/v3/s3-storage:stats
     */
    #[ApiOperation(
        summary: 'rest_s3_Stats',
        description: 'rest_s3_StatsDesc',
        operationId: 'getS3Stats'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function stats(): void
    {
        // Implementation handled by BaseRestController
    }

}

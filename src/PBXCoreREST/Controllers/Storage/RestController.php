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

namespace MikoPBX\PBXCoreREST\Controllers\Storage;

use MikoPBX\PBXCoreREST\Attributes\ApiDataSchema;
use MikoPBX\PBXCoreREST\Attributes\ApiOperation;
use MikoPBX\PBXCoreREST\Attributes\ApiParameter;
use MikoPBX\PBXCoreREST\Attributes\ParameterLocation;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use MikoPBX\PBXCoreREST\Attributes\ApiResponse;
use MikoPBX\PBXCoreREST\Attributes\HttpMapping;
use MikoPBX\PBXCoreREST\Attributes\ResourceSecurity;
use MikoPBX\PBXCoreREST\Attributes\SecurityType;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\StorageManagementProcessor;

/**
 * RESTful controller for Storage management (v3 API)
 *
 * Storage is a singleton resource - there's only one storage configuration in the system.
 * This controller implements standard REST operations without resource IDs.
 */
#[ApiResource(
    path: '/pbxcore/api/v3/storage',
    tags: ['Storage'],
    description: 'Comprehensive storage and disk management for MikoPBX. This singleton resource provides access to storage configuration including disk selection, mount points, usage statistics, and file system operations. Manages call recording retention periods, monitors disk space utilization, and provides tools for formatting and mounting storage devices. Essential for system administrators managing storage capacity and data retention policies.',
    processor: StorageManagementProcessor::class
)]
#[ResourceSecurity('storage', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getRecord', 'usage', 'list'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'POST' => ['mount', 'umount', 'mkfs', 'statusMkfs']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['usage', 'list', 'mount', 'umount', 'mkfs', 'statusMkfs'],
    customMethods: ['usage', 'list', 'mount', 'umount', 'mkfs', 'statusMkfs'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = StorageManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    // ============================================================================
    // Standard CRUD Operations (Singleton)
    // ============================================================================

    /**
     * Get storage configuration
     *
     * Returns the current storage configuration including selected disk, mount point,
     * recording retention period, and basic disk information. As a singleton resource,
     * this endpoint returns the single storage configuration without requiring an ID.
     */
    #[ApiOperation(
        summary: 'rest_stg_GetRecord',
        description: 'rest_stg_GetRecordDesc',
        operationId: 'getStorageConfig'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with storage configuration',
        schema: '#/components/schemas/StorageConfig'
    )]
    public function getRecord(): void
    {
        parent::handleCRUDRequest();
    }

    /**
     * Update storage configuration
     *
     * Completely replaces the storage configuration. All fields must be provided.
     * Use PATCH endpoint for partial updates. Changes to disk selection may require
     * system restart to take effect. Recording retention period changes apply immediately.
     */
    #[ApiOperation(
        summary: 'rest_stg_Update',
        description: 'rest_stg_UpdateDesc',
        operationId: 'updateStorageConfig'
    )]
    #[ApiParameter(
        name: 'disk',
        type: 'string',
        description: 'rest_param_stg_disk',
        required: true,
        example: '/dev/sdb1'
    )]
    #[ApiParameter(
        name: 'PBXRecordSavePeriod',
        type: 'integer',
        description: 'rest_param_stg_save_period',
        required: false,
        minimum: 1,
        maximum: 3650,
        example: 180
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Storage configuration updated successfully',
        schema: '#/components/schemas/StorageConfig'
    )]
    #[ApiResponse(statusCode: 400, description: 'Invalid configuration data')]
    public function update(): void
    {
        parent::handleCRUDRequest();
    }

    /**
     * Partially update storage configuration
     *
     * Updates only the specified fields in the storage configuration.
     * Useful for changing recording retention period without affecting disk selection,
     * or vice versa. Unspecified fields remain unchanged.
     */
    #[ApiOperation(
        summary: 'rest_stg_Patch',
        description: 'rest_stg_PatchDesc',
        operationId: 'patchStorageConfig'
    )]
    #[ApiParameter(
        name: 'disk',
        type: 'string',
        description: 'rest_param_stg_disk',
        required: false,
        example: '/dev/sdb1'
    )]
    #[ApiParameter(
        name: 'PBXRecordSavePeriod',
        type: 'integer',
        description: 'rest_param_stg_save_period',
        required: false,
        minimum: 1,
        maximum: 3650,
        example: 180
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Storage configuration partially updated',
        schema: '#/components/schemas/StorageConfig'
    )]
    #[ApiResponse(statusCode: 400, description: 'Invalid configuration data')]
    public function patch(): void
    {
        parent::handleCRUDRequest();
    }

    // ============================================================================
    // Custom READ Operations
    // ============================================================================

    /**
     * Get storage usage statistics
     *
     * Returns detailed statistics about storage utilization including total, used, and free space,
     * breakdown by data types (recordings, backups, logs), and disk I/O statistics.
     * Useful for monitoring and capacity planning.
     */
    #[ApiOperation(
        summary: 'rest_stg_Usage',
        description: 'rest_stg_UsageDesc',
        operationId: 'getStorageUsage'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with storage usage statistics'
    )]
    public function usage(): void
    {
        // Implemented by processor
    }

    /**
     * List available storage devices
     *
     * Returns a list of all storage devices detected by the system including internal disks,
     * USB drives, and network storage. Each device includes information about capacity,
     * file system type, mount status, and whether it's currently in use by MikoPBX.
     */
    #[ApiOperation(
        summary: 'rest_stg_List',
        description: 'rest_stg_ListDesc',
        operationId: 'listStorageDevices'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with available storage devices'
    )]
    public function list(): void
    {
        // Implemented by processor
    }

    // ============================================================================
    // Custom WRITE Operations
    // ============================================================================

    /**
     * Mount storage device
     *
     * Manually mount a storage device to make it accessible to the system.
     * The device will be mounted to a standard location. If the device is already mounted,
     * this operation will verify the mount is correct. Use this before configuring
     * a device as MikoPBX storage.
     */
    #[ApiOperation(
        summary: 'rest_stg_Mount',
        description: 'rest_stg_MountDesc',
        operationId: 'mountStorageDevice'
    )]
    #[ApiParameter(
        name: 'device',
        type: 'string',
        description: 'rest_param_stg_device',
        required: true,
        example: '/dev/sdb1'
    )]
    #[ApiParameter(
        name: 'mountPoint',
        type: 'string',
        description: 'rest_param_stg_mount_point',
        required: false,
        example: '/storage/usbdisk1'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Device mounted successfully'
    )]
    #[ApiResponse(statusCode: 400, description: 'Device not found or already mounted')]
    public function mount(): void
    {
        // Implemented by processor
    }

    /**
     * Unmount storage device
     *
     * Safely unmount a storage device. This ensures all data is written to disk before
     * disconnection. If the device is currently in use by MikoPBX, the operation will fail.
     * Stop using the device for storage before unmounting.
     */
    #[ApiOperation(
        summary: 'rest_stg_Umount',
        description: 'rest_stg_UmountDesc',
        operationId: 'unmountStorageDevice'
    )]
    #[ApiParameter(
        name: 'device',
        type: 'string',
        description: 'rest_param_stg_device',
        required: true,
        example: '/dev/sdb1'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Device unmounted successfully'
    )]
    #[ApiResponse(statusCode: 400, description: 'Device not found, not mounted, or in use')]
    public function umount(): void
    {
        // Implemented by processor
    }

    /**
     * Format storage device
     *
     * Format a storage device with a file system suitable for MikoPBX (typically ext4).
     * WARNING: This operation will destroy all data on the device. The formatting process
     * runs asynchronously. Use the statusMkfs endpoint to monitor progress.
     */
    #[ApiOperation(
        summary: 'rest_stg_Mkfs',
        description: 'rest_stg_MkfsDesc',
        operationId: 'formatStorageDevice'
    )]
    #[ApiParameter(
        name: 'device',
        type: 'string',
        description: 'rest_param_stg_device',
        required: true,
        example: '/dev/sdb1'
    )]
    #[ApiParameter(
        name: 'fileSystem',
        type: 'string',
        description: 'rest_param_stg_filesystem',
        required: false,
        enum: ['ext4', 'ext3'],
        default: 'ext4'
    )]
    #[ApiParameter(
        name: 'label',
        type: 'string',
        description: 'rest_param_stg_label',
        required: false,
        maxLength: 16,
        example: 'MikoPBX-Storage'
    )]
    #[ApiResponse(
        statusCode: 202,
        description: 'Formatting started'
    )]
    #[ApiResponse(statusCode: 400, description: 'Device not found or in use')]
    public function mkfs(): void
    {
        // Implemented by processor
    }

    /**
     * Get formatting status
     *
     * Check the status of an ongoing format operation. Returns progress information,
     * completion status, and any errors encountered. Formatting can take several minutes
     * for large disks. Poll this endpoint to monitor progress.
     */
    #[ApiOperation(
        summary: 'rest_stg_StatusMkfs',
        description: 'rest_stg_StatusMkfsDesc',
        operationId: 'getFormatStatus'
    )]
    #[ApiParameter(
        name: 'taskId',
        type: 'string',
        description: 'rest_param_stg_task_id',
        required: true,
        example: 'mkfs-task-123'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Formatting status'
    )]
    #[ApiResponse(statusCode: 404, description: 'Task not found')]
    public function statusMkfs(): void
    {
        // Implemented by processor
    }

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['usage', 'list'],
            'POST' => ['mount', 'umount', 'mkfs', 'statusMkfs']
        ];
    }
}

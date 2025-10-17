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

namespace MikoPBX\PBXCoreREST\Controllers\TimeSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Attributes\ApiOperation;
use MikoPBX\PBXCoreREST\Attributes\ApiParameterRef;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use MikoPBX\PBXCoreREST\Attributes\ApiResponse;
use MikoPBX\PBXCoreREST\Attributes\HttpMapping;
use MikoPBX\PBXCoreREST\Attributes\ResourceSecurity;
use MikoPBX\PBXCoreREST\Attributes\SecurityType;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\TimeSettingsManagementProcessor;

/**
 * RESTful controller for Time Settings management (v3 API)
 *
 * Time Settings is a singleton resource - there's only one time configuration in the system.
 * This controller implements standard REST operations without resource IDs.
 */
#[ApiResource(
    path: '/pbxcore/api/v3/time-settings',    
    tags: ['Time Settings'],
    description: 'Comprehensive time and timezone management for MikoPBX. This singleton resource provides access to system time configuration including timezone selection, NTP server settings, and manual time adjustment. Essential for ensuring accurate call timestamps, scheduled tasks execution, and system log correlation. Supports automatic time synchronization via NTP or manual time setting for isolated networks.',
    processor: TimeSettingsManagementProcessor::class
)]
#[ResourceSecurity('time-settings', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getRecord', 'getAvailableTimezones'],
        'PUT' => ['update'],
        'PATCH' => ['patch']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getAvailableTimezones'],
    customMethods: ['getAvailableTimezones'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = TimeSettingsManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    // ============================================================================
    // Standard CRUD Operations (Singleton)
    // ============================================================================

    /**
     * Get time settings configuration
     *
     * Returns the current time and timezone configuration including selected timezone,
     * NTP server settings, manual time setting mode, and current system time.
     * As a singleton resource, this endpoint returns the single time configuration
     * without requiring an ID.
     */
    #[ApiOperation(
        summary: 'rest_ts_GetRecord',
        description: 'rest_ts_GetRecordDesc',
        operationId: 'getTimeSettings'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with time settings',
        schema: '#/components/schemas/TimeSettings'
    )]
    public function getRecord(): void
    {
        parent::handleCRUDRequest();
    }

    /**
     * Update time settings configuration
     *
     * Completely replaces the time settings configuration. All fields must be provided.
     * Use PATCH endpoint for partial updates. Changes to timezone affect call timestamps
     * and scheduled task execution. NTP server changes trigger immediate time synchronization.
     * Manual time setting disables NTP synchronization.
     */
    #[ApiOperation(
        summary: 'rest_ts_Update',
        description: 'rest_ts_UpdateDesc',
        operationId: 'updateTimeSettings'
    )]
    #[ApiParameterRef(PbxSettings::PBX_TIMEZONE, required: true)]
    #[ApiParameterRef(PbxSettings::NTP_SERVER)]
    #[ApiParameterRef(PbxSettings::PBX_MANUAL_TIME_SETTINGS)]
    #[ApiParameterRef('ManualDateTime')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Time settings updated successfully',
        schema: '#/components/schemas/TimeSettings'
    )]
    #[ApiResponse(statusCode: 400, description: 'Invalid timezone or configuration data')]
    public function update(): void
    {
        parent::handleCRUDRequest();
    }

    /**
     * Partially update time settings configuration
     *
     * Updates only the specified fields in the time settings configuration.
     * Useful for changing timezone without affecting NTP settings, or updating
     * NTP server without changing timezone. Unspecified fields remain unchanged.
     */
    #[ApiOperation(
        summary: 'rest_ts_Patch',
        description: 'rest_ts_PatchDesc',
        operationId: 'patchTimeSettings'
    )]
    #[ApiParameterRef(PbxSettings::PBX_TIMEZONE)]
    #[ApiParameterRef(PbxSettings::NTP_SERVER)]
    #[ApiParameterRef(PbxSettings::PBX_MANUAL_TIME_SETTINGS)]
    #[ApiParameterRef('ManualDateTime')]
    #[ApiResponse(
        statusCode: 200,
        description: 'Time settings partially updated',
        schema: '#/components/schemas/TimeSettings'
    )]
    #[ApiResponse(statusCode: 400, description: 'Invalid timezone or configuration data')]
    public function patch(): void
    {
        parent::handleCRUDRequest();
    }

    // ============================================================================
    // Custom READ Operations
    // ============================================================================

    /**
     * Get list of available timezones
     *
     * Returns a comprehensive list of all available timezones in IANA format.
     * Includes timezone identifiers, display names, and UTC offsets.
     * Useful for populating timezone selection dropdowns in user interfaces.
     * Timezones are grouped by region for easier navigation.
     */
    #[ApiOperation(
        summary: 'rest_ts_GetAvailableTimezones',
        description: 'rest_ts_GetAvailableTimezonesDesc',
        operationId: 'getAvailableTimezones'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'Successful response with available timezones',
        content: [
            'application/json' => [
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'success' => ['type' => 'boolean', 'example' => true],
                        'data' => [
                            'type' => 'array',
                            'items' => ['$ref' => '#/components/schemas/Timezone']
                        ]
                    ]
                ]
            ]
        ]
    )]
    public function getAvailableTimezones(): void
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
            'GET' => ['getAvailableTimezones'],
            'POST' => []
        ];
    }
}

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

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\System\DataStructure;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for system management (v3 API)
 *
 * Singleton resource for system-wide operations and management.
 * Provides power management, health checks, datetime operations, language settings,
 * and system maintenance commands. All operations are custom methods.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\System
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/system',    
    tags: ['System'],
    description: 'System-wide management singleton resource. ' .
                'Provides power management (reboot, shutdown), health monitoring (ping, checkAuth), ' .
                'datetime operations, language settings, audio conversion, system upgrades and factory reset.',
    processor: SystemManagementProcessor::class
)]
#[ResourceSecurity('system', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['ping', 'checkAuth', 'getDeleteStatistics', 'datetime', 'getAvailableLanguages'],
        'PUT' => ['datetime'],
        'POST' => ['reboot', 'shutdown', 'updateMailSettings', 'convertAudioFile', 'upgrade', 'restoreDefault', 'changeLanguage'],
        'PATCH' => ['changeLanguage']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['ping', 'checkAuth', 'getDeleteStatistics', 'datetime', 'getAvailableLanguages', 'reboot', 'shutdown', 'updateMailSettings', 'convertAudioFile', 'upgrade', 'restoreDefault', 'changeLanguage'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SystemManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Ping backend to check if it's alive (PUBLIC - health check endpoint)
     *
     * @route GET /pbxcore/api/v3/system:ping
     */
    #[ResourceSecurity('system_ping', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_system_Ping',
        description: 'rest_system_PingDesc',
        operationId: 'pingSystem'
    )]
    #[ApiResponse(200, 'rest_response_200_pong')]
    public function ping(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check if user is authenticated
     *
     * @route GET /pbxcore/api/v3/system:checkAuth
     */
    #[ApiOperation(
        summary: 'rest_system_CheckAuth',
        description: 'rest_system_CheckAuthDesc',
        operationId: 'checkAuthentication'
    )]
    #[ApiResponse(200, 'rest_response_200_authenticated')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    public function checkAuth(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get system date and time
     *
     * @route GET /pbxcore/api/v3/system:datetime
     */
    #[ApiOperation(
        summary: 'rest_system_GetDatetime',
        description: 'rest_system_GetDatetimeDesc',
        operationId: 'getSystemDatetime'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function datetime(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get available interface languages (PUBLIC - used on login page)
     *
     * @route GET /pbxcore/api/v3/system:getAvailableLanguages
     */
    #[ResourceSecurity('system_languages', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_system_GetAvailableLanguages',
        description: 'rest_system_GetAvailableLanguagesDesc',
        operationId: 'getAvailableLanguages'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    public function getAvailableLanguages(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get statistics about data to be deleted before factory reset
     *
     * @route GET /pbxcore/api/v3/system:getDeleteStatistics
     */
    #[ApiOperation(
        summary: 'rest_system_GetDeleteStatistics',
        description: 'rest_system_GetDeleteStatisticsDesc',
        operationId: 'getDeleteStatistics'
    )]
    #[ApiResponse(200, 'rest_response_200_stats')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDeleteStatistics(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Reboot the system
     *
     * @route POST /pbxcore/api/v3/system:reboot
     */
    #[ApiOperation(
        summary: 'rest_system_Reboot',
        description: 'rest_system_RebootDesc',
        operationId: 'rebootSystem'
    )]
    #[ApiResponse(200, 'rest_response_200_rebooting')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function reboot(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Shutdown the system
     *
     * @route POST /pbxcore/api/v3/system:shutdown
     */
    #[ApiOperation(
        summary: 'rest_system_Shutdown',
        description: 'rest_system_ShutdownDesc',
        operationId: 'shutdownSystem'
    )]
    #[ApiResponse(200, 'rest_response_200_shutting_down')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function shutdown(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update mail settings (legacy method)
     *
     * @route POST /pbxcore/api/v3/system:updateMailSettings
     */
    #[ApiOperation(
        summary: 'rest_system_UpdateMailSettings',
        description: 'rest_system_UpdateMailSettingsDesc',
        operationId: 'updateMailSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function updateMailSettings(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Convert audio file to system format
     *
     * @route POST /pbxcore/api/v3/system:convertAudioFile
     */
    #[ApiOperation(
        summary: 'rest_system_ConvertAudioFile',
        description: 'rest_system_ConvertAudioFileDesc',
        operationId: 'convertAudioFile'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiResponse(200, 'rest_response_200_converted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function convertAudioFile(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Upgrade system from image file
     *
     * @route POST /pbxcore/api/v3/system:upgrade
     */
    #[ApiOperation(
        summary: 'rest_system_Upgrade',
        description: 'rest_system_UpgradeDesc',
        operationId: 'upgradeSystem'
    )]
    #[ApiParameterRef('filename', required: true)]
    #[ApiResponse(200, 'rest_response_200_upgrading')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function upgrade(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Restore system to factory defaults
     *
     * @route POST /pbxcore/api/v3/system:restoreDefault
     */
    #[ApiOperation(
        summary: 'rest_system_RestoreDefault',
        description: 'rest_system_RestoreDefaultDesc',
        operationId: 'restoreToDefaults'
    )]
    #[ApiResponse(200, 'rest_response_200_restoring')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function restoreDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Change system interface language (PUBLIC - used on login page)
     *
     * @route POST /pbxcore/api/v3/system:changeLanguage
     * @route PATCH /pbxcore/api/v3/system:changeLanguage
     */
    #[ResourceSecurity('system_change_language', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_system_ChangeLanguage',
        description: 'rest_system_ChangeLanguageDesc',
        operationId: 'changeLanguage'
    )]
    #[ApiParameterRef('language', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    public function changeLanguage(): void
    {
        // Implementation handled by BaseRestController
    }
}
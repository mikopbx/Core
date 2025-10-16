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

namespace MikoPBX\PBXCoreREST\Controllers\GeneralSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\GeneralSettingsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\GeneralSettings\DataStructure;
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
 * RESTful controller for general settings management (v3 API)
 *
 * Comprehensive system-wide configuration management following Google API Design Guide patterns.
 * Implements singleton resource pattern as there's only one set of general settings in the system.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\GeneralSettings
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/general-settings',
    tags: ['General Settings'],
    description: 'Comprehensive system-wide configuration management. ' .
                'Provides access to PBX general settings including system name, language, timezone, ' .
                'web/SSH access configuration, SIP settings, recording options, and codec management. ' .
                'Implements singleton resource pattern.',
    processor: GeneralSettingsManagementProcessor::class
)]
#[ResourceSecurity('general_settings', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'POST' => ['updateCodecs']
    ],
    resourceLevelMethods: ['getRecord'],
    collectionLevelMethods: ['getList', 'update', 'patch', 'getDefault', 'updateCodecs'],
    customMethods: ['getDefault', 'updateCodecs'],
    idPattern: '[a-zA-Z_]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = GeneralSettingsManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;


    /**
     * Get all general settings
     *
     * @route GET /pbxcore/api/v3/general-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_gs_GetRecord',
        description: 'rest_gs_GetRecordDesc',
        operationId: 'getGeneralSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get specific setting by key
     *
     * @route GET /pbxcore/api/v3/general-settings/{key}
     */
    #[ApiOperation(
        summary: 'rest_gs_GetSetting',
        description: 'rest_gs_GetSettingDesc',
        operationId: 'getGeneralSetting'
    )]
    #[ApiParameterRef('key', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getRecord(string $key): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update general settings (full replacement)
     *
     * WHY: Uses ApiParameterRef to reference DataStructure definitions (Single Source of Truth).
     * All field constraints (type, validation, defaults) inherited from DataStructure::getParameterDefinitions().
     *
     * @route PUT /pbxcore/api/v3/general-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_gs_Update',
        description: 'rest_gs_UpdateDesc',
        operationId: 'updateGeneralSettings'
    )]
    #[ApiParameterRef(PbxSettings::PBX_NAME)]
    #[ApiParameterRef(PbxSettings::PBX_DESCRIPTION)]
    #[ApiParameterRef(PbxSettings::PBX_LANGUAGE)]
    #[ApiParameterRef(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH)]
    #[ApiParameterRef(PbxSettings::PBX_RECORD_CALLS)]
    #[ApiParameterRef(PbxSettings::PBX_RECORD_CALLS_INNER)]
    #[ApiParameterRef(PbxSettings::WEB_PORT)]
    #[ApiParameterRef(PbxSettings::WEB_HTTPS_PORT)]
    #[ApiParameterRef(PbxSettings::WEB_ADMIN_LOGIN)]
    #[ApiParameterRef(PbxSettings::WEB_ADMIN_PASSWORD)]
    #[ApiParameterRef(PbxSettings::SIP_PORT)]
    #[ApiParameterRef(PbxSettings::TLS_PORT)]
    #[ApiParameterRef(PbxSettings::RTP_PORT_FROM)]
    #[ApiParameterRef(PbxSettings::RTP_PORT_TO)]
    #[ApiParameterRef(PbxSettings::SSH_PORT)]
    #[ApiParameterRef(PbxSettings::SSH_PASSWORD)]
    #[ApiParameterRef(PbxSettings::AMI_ENABLED)]
    #[ApiParameterRef(PbxSettings::AMI_PORT)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function update(?string $id = null): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update general settings
     *
     * WHY: Uses ApiParameterRef to reference DataStructure definitions (Single Source of Truth).
     * PATCH allows updating only specific fields without affecting others.
     *
     * @route PATCH /pbxcore/api/v3/general-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_gs_Patch',
        description: 'rest_gs_PatchDesc',
        operationId: 'patchGeneralSettings'
    )]
    #[ApiParameterRef(PbxSettings::PBX_NAME)]
    #[ApiParameterRef(PbxSettings::PBX_DESCRIPTION)]
    #[ApiParameterRef(PbxSettings::PBX_LANGUAGE)]
    #[ApiParameterRef(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH)]
    #[ApiParameterRef(PbxSettings::WEB_PORT)]
    #[ApiParameterRef(PbxSettings::WEB_HTTPS_PORT)]
    #[ApiParameterRef(PbxSettings::SIP_PORT)]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function patch(?string $id = null): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default values for general settings
     *
     * @route GET /pbxcore/api/v3/general-settings:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_gs_GetDefault',
        description: 'rest_gs_GetDefaultDesc',
        operationId: 'getGeneralSettingsDefaults'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update codec configuration
     *
     * @route POST /pbxcore/api/v3/general-settings:updateCodecs
     */
    #[ApiOperation(
        summary: 'rest_gs_UpdateCodecs',
        description: 'rest_gs_UpdateCodecsDesc',
        operationId: 'updateCodecsConfiguration'
    )]
    #[ApiParameterRef('codecs', required: true)]
    #[ApiResponse(200, 'rest_response_200_codecs_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(422, 'rest_response_422_validation', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function updateCodecs(): void
    {
        // Implementation handled by BaseRestController
    }
}
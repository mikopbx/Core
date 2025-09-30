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

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\GeneralSettingsManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity,
    ActionType
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
    description: 'System-wide configuration management for MikoPBX core settings. ' .
                'Includes PBX identification, network settings, codec preferences, voicemail configuration, ' .
                'call routing defaults, security parameters, and system behavior controls. ' .
                'Singleton resource pattern - only one configuration exists.',
    processor: GeneralSettingsManagementProcessor::class
)]
#[ResourceSecurity('general_settings', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault'],
        'POST' => ['updateCodecs'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['reset']
    ],
    resourceLevelMethods: ['getRecord'],
    collectionLevelMethods: ['getList', 'update', 'patch', 'reset'],
    customMethods: ['getDefault', 'updateCodecs'],
    idPattern: '[A-Za-z][A-Za-z0-9_]*'
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
    #[ApiOperation(
        summary: 'Get general settings',
        description: 'Retrieve all system-wide configuration settings as a single JSON object',
        operationId: 'getGeneralSettings'
    )]
    #[ApiResponse(200, 'General settings retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"PBXName":"MikoPBX","PBXDescription":"Small Business PBX","PBXLanguage":"en","PBXTimezone":"UTC","PBXRecordCalls":"all","VoicemailNotifyByEmail":"1","SystemNotificationsEmail":"admin@company.com"},"messages":[],"function":"getList","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\GetListAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::READ)]
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
        summary: 'Get specific setting',
        description: 'Retrieve a specific configuration setting by its key name',
        operationId: 'getGeneralSetting'
    )]
    #[ApiParameter(
        name: 'key',
        type: 'string',
        description: 'Configuration setting key name',
        in: ParameterLocation::PATH,
        required: true,
        example: 'PBXName'
    )]
    #[ApiResponse(200, 'Setting retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"key":"PBXName","value":"MikoPBX","description":"PBX system name"},"messages":[],"function":"getRecord","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\GetRecordAction::main","pid":1408}')]
    #[ApiResponse(404, 'Setting not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::READ)]
    public function getRecord(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update all general settings (full replacement)
     *
     * @route PUT /pbxcore/api/v3/general-settings
     */
    #[ApiOperation(
        summary: 'Update general settings',
        description: 'Replace all general settings with provided configuration. All settings will be updated to match the request.',
        operationId: 'updateGeneralSettings'
    )]
    #[ApiParameter('PBXName', 'string', 'PBX system name', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Company PBX')]
    #[ApiParameter('PBXDescription', 'string', 'PBX system description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Main office telephone system')]
    #[ApiParameter('PBXLanguage', 'string', 'Default system language', ParameterLocation::QUERY, required: false, enum: ['en', 'ru', 'de', 'es', 'fr', 'it', 'pt', 'uk'], default: 'en', example: 'en')]
    #[ApiParameter('PBXTimezone', 'string', 'System timezone', ParameterLocation::QUERY, required: false, maxLength: 50, example: 'America/New_York')]
    #[ApiParameter('PBXRecordCalls', 'string', 'Call recording mode', ParameterLocation::QUERY, required: false, enum: ['all', 'internal', 'external', 'none'], default: 'none', example: 'all')]
    #[ApiParameter('VoicemailNotifyByEmail', 'boolean', 'Enable voicemail email notifications', ParameterLocation::QUERY, required: false, default: false, example: true)]
    #[ApiParameter('SystemNotificationsEmail', 'string', 'System notifications email address', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('SSHPassword', 'string', 'SSH access password', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'securePassword123')]
    #[ApiParameter('WEBPort', 'integer', 'Web interface port', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, default: 80, example: 8080)]
    #[ApiParameter('WEBHTTPSPort', 'integer', 'HTTPS web interface port', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, default: 443, example: 8443)]
    #[ApiResponse(200, 'General settings updated successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"PBXName":"Company PBX","PBXDescription":"Main office telephone system"},"messages":["Settings updated successfully"],"function":"update","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\UpdateAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::WRITE)]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update general settings
     *
     * @route PATCH /pbxcore/api/v3/general-settings
     */
    #[ApiOperation(
        summary: 'Patch general settings',
        description: 'Partially update general settings. Only provided fields will be modified, others remain unchanged.',
        operationId: 'patchGeneralSettings'
    )]
    #[ApiParameter('PBXName', 'string', 'PBX system name', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated PBX Name')]
    #[ApiParameter('PBXDescription', 'string', 'PBX system description', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'Updated description')]
    #[ApiParameter('PBXLanguage', 'string', 'Default system language', ParameterLocation::QUERY, required: false, enum: ['en', 'ru', 'de', 'es', 'fr', 'it', 'pt', 'uk'], example: 'ru')]
    #[ApiParameter('VoicemailNotifyByEmail', 'boolean', 'Enable voicemail email notifications', ParameterLocation::QUERY, required: false, example: false)]
    #[ApiResponse(200, 'General settings patched successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"PBXName":"Updated PBX Name","PBXLanguage":"ru"},"messages":["Settings updated successfully"],"function":"patch","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\PatchAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::WRITE)]
    public function patch(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Reset general settings to defaults
     *
     * @route DELETE /pbxcore/api/v3/general-settings
     */
    #[ApiOperation(
        summary: 'Reset general settings',
        description: 'Reset all general settings to their default values. This action cannot be undone.',
        operationId: 'resetGeneralSettings'
    )]
    #[ApiResponse(200, 'General settings reset successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"messages":["General settings reset to defaults"],"function":"reset","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\ResetAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::WRITE)]
    public function reset(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default values for general settings
     *
     * @route GET /pbxcore/api/v3/general-settings:getDefault
     */
    #[ApiOperation(
        summary: 'Get default general settings',
        description: 'Retrieve default configuration values for all general settings',
        operationId: 'getGeneralSettingsDefaults'
    )]
    #[ApiResponse(200, 'Default values retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"PBXName":"MikoPBX","PBXDescription":"","PBXLanguage":"en","PBXTimezone":"UTC","PBXRecordCalls":"none","VoicemailNotifyByEmail":"0","SystemNotificationsEmail":"","WEBPort":"80","WEBHTTPSPort":"443"},"messages":[],"function":"getDefault","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\GetDefaultAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::READ)]
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
        summary: 'Update codec configuration',
        description: 'Update the system-wide codec priority and availability settings for audio/video calls',
        operationId: 'updateCodecsConfiguration'
    )]
    #[ApiParameter('codecs', 'array', 'Array of codec configurations with priority and enabled status', ParameterLocation::QUERY, required: true, example: '[{"name":"alaw","priority":0,"disabled":false},{"name":"ulaw","priority":1,"disabled":false},{"name":"g729","priority":2,"disabled":true}]')]
    #[ApiResponse(200, 'Codec configuration updated successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"codecs_updated":3,"codecs_disabled":1},"messages":["Codec configuration updated successfully"],"function":"updateCodecs","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\GeneralSettings\\\\UpdateCodecsAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid codec configuration', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('general_settings', ActionType::WRITE)]
    public function updateCodecs(): void
    {
        // Implementation handled by BaseRestController
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\MailSettings;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\MailSettingsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\MailSettings\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for mail settings management (v3 API)
 *
 * Comprehensive mail settings management including SMTP configuration, OAuth2 authentication,
 * and connection testing. Implements singleton resource pattern as there's only one mail configuration.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\MailSettings
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/mail-settings',
    tags: ['Mail Settings'],
    description: 'Mail server configuration management for system notifications and alerts. ' .
                'Supports SMTP authentication including OAuth2 for Gmail, Outlook, and other providers. ' .
                'Includes connection testing and automated token refresh capabilities.',
    processor: MailSettingsManagementProcessor::class
)]
#[ResourceSecurity('mail_settings', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getOAuth2Url', 'getDiagnostics', 'getDefault'],
        'POST' => ['testConnection', 'sendTestEmail', 'refreshToken'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['reset']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getList', 'update', 'patch', 'reset'],
    customMethods: ['getOAuth2Url', 'testConnection', 'sendTestEmail', 'refreshToken', 'getDiagnostics', 'getDefault'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    protected string $processorClass = MailSettingsManagementProcessor::class;

    /**
     * Get current mail settings configuration
     *
     * @route GET /pbxcore/api/v3/mail-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ms_GetRecord',
        description: 'rest_ms_GetRecordDesc',
        operationId: 'getMailSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update mail settings (full replacement)
     *
     * @route PUT /pbxcore/api/v3/mail-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ms_Update',
        description: 'rest_ms_UpdateDesc',
        operationId: 'updateMailSettings'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'rest_param_ms_smtp_host', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'smtp.gmail.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'rest_param_ms_smtp_port', ParameterLocation::QUERY, required: true, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPAuthType', 'string', 'rest_param_ms_auth_type', ParameterLocation::QUERY, required: false, enum: ['none', 'plain', 'login', 'oauth2'], default: 'none', example: 'oauth2')]
    #[ApiParameter('MailSMTPUsername', 'string', 'rest_param_ms_username', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('MailSMTPPassword', 'string', 'rest_param_ms_password', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'password123')]
    #[ApiParameter('MailSMTPUseTLS', 'boolean', 'rest_param_ms_use_tls', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiParameter('MailFromUsername', 'string', 'rest_param_ms_from_username', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'PBX System')]
    #[ApiParameter('MailFromAddress', 'string', 'rest_param_ms_from_address', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('MailEnableNotifications', 'boolean', 'rest_param_ms_enable_notifications', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update mail settings
     *
     * @route PATCH /pbxcore/api/v3/mail-settings
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ms_Patch',
        description: 'rest_ms_PatchDesc',
        operationId: 'patchMailSettings'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'rest_param_ms_smtp_host', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'smtp.outlook.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'rest_param_ms_smtp_port', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPAuthType', 'string', 'rest_param_ms_auth_type', ParameterLocation::QUERY, required: false, enum: ['none', 'plain', 'login', 'oauth2'], example: 'oauth2')]
    #[ApiParameter('MailEnableNotifications', 'boolean', 'rest_param_ms_enable_notifications', ParameterLocation::QUERY, required: false, example: false)]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function patch(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Reset mail settings to defaults
     *
     * @route DELETE /pbxcore/api/v3/mail-settings
     */
    #[ApiOperation(
        summary: 'rest_ms_Reset',
        description: 'rest_ms_ResetDesc',
        operationId: 'resetMailSettings'
    )]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function reset(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Test SMTP connection with current settings
     *
     * @route POST /pbxcore/api/v3/mail-settings:testConnection
     */
    #[ApiOperation(
        summary: 'rest_ms_TestConnection',
        description: 'rest_ms_TestConnectionDesc',
        operationId: 'testMailConnection'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'rest_param_ms_smtp_host', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'smtp.gmail.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'rest_param_ms_smtp_port', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPUsername', 'string', 'rest_param_ms_username', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'test@company.com')]
    #[ApiParameter('MailSMTPPassword', 'string', 'rest_param_ms_password', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'testpassword')]
    #[ApiResponse(200, 'rest_response_200_test')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function testConnection(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Send test email using current configuration
     *
     * @route POST /pbxcore/api/v3/mail-settings:sendTestEmail
     */
    #[ApiOperation(
        summary: 'rest_ms_SendTestEmail',
        description: 'rest_ms_SendTestEmailDesc',
        operationId: 'sendTestEmail'
    )]
    #[ApiParameter('to', 'string', 'rest_param_ms_test_email_to', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('subject', 'string', 'rest_param_ms_test_email_subject', ParameterLocation::QUERY, required: false, maxLength: 255, default: 'MikoPBX Test Email', example: 'Test Email from PBX')]
    #[ApiParameter('body', 'string', 'rest_param_ms_test_email_body', ParameterLocation::QUERY, required: false, maxLength: 5000, default: 'This is a test email from MikoPBX system.', example: 'Test message to verify mail configuration.')]
    #[ApiResponse(200, 'rest_response_200_test')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function sendTestEmail(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get OAuth2 authorization URL for mail provider
     *
     * @route GET /pbxcore/api/v3/mail-settings:getOAuth2Url
     */
    #[ApiOperation(
        summary: 'rest_ms_GetOAuth2Url',
        description: 'rest_ms_GetOAuth2UrlDesc',
        operationId: 'getOAuth2AuthUrl'
    )]
    #[ApiParameter('provider', 'string', 'rest_param_ms_oauth2_provider', ParameterLocation::QUERY, required: true, enum: ['google', 'microsoft', 'yahoo'], example: 'google')]
    #[ApiParameter('redirect_uri', 'string', 'rest_param_ms_oauth2_redirect_uri', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'https://pbx.company.com/pbxcore/api/v3/mail-settings/oauth2-callback')]
    #[ApiResponse(200, 'rest_response_200_generated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getOAuth2Url(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Refresh OAuth2 access token
     *
     * @route POST /pbxcore/api/v3/mail-settings:refreshToken
     */
    #[ApiOperation(
        summary: 'rest_ms_RefreshToken',
        description: 'rest_ms_RefreshTokenDesc',
        operationId: 'refreshOAuth2Token'
    )]
    #[ApiParameter('provider', 'string', 'rest_param_ms_oauth2_provider', ParameterLocation::QUERY, required: false, enum: ['google', 'microsoft', 'yahoo'], example: 'google')]
    #[ApiResponse(200, 'rest_response_200_refreshed')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function refreshToken(): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get diagnostics information about mail settings
     *
     * @route GET /pbxcore/api/v3/mail-settings:getDiagnostics
     */
    #[ApiOperation(
        summary: 'rest_ms_GetDiagnostics',
        description: 'rest_ms_GetDiagnosticsDesc',
        operationId: 'getMailDiagnostics'
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDiagnostics(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default mail settings template
     *
     * @route GET /pbxcore/api/v3/mail-settings:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_ms_GetDefault',
        description: 'rest_ms_GetDefaultDesc',
        operationId: 'getMailSettingsDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

}
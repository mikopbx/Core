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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\MailSettingsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\MailSettings\DataStructure;
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
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    // All constraints (enum, pattern, maxLength, min/max, defaults) inherited from definitions
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_HOST, required: true)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PORT, required: true)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_AUTH_TYPE)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_USERNAME)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PASSWORD)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_USE_TLS)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_CERT_CHECK)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_FROM_USERNAME)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_SENDER_ADDRESS, required: true)]
    #[ApiParameterRef(PbxSettings::MAIL_ENABLE_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_VOICEMAIL_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_LOGIN_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_SYSTEM_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_PROVIDER)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_CLIENT_ID)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN)]
    #[ApiParameterRef(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL)]
    #[ApiParameterRef(PbxSettings::SYSTEM_EMAIL_FOR_MISSED)]
    #[ApiParameterRef(PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL)]
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
    // ✨ Lightweight references (all optional in PATCH)
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_HOST)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PORT)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_AUTH_TYPE)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_USERNAME)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PASSWORD)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_USE_TLS)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_CERT_CHECK)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_FROM_USERNAME)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_SENDER_ADDRESS)]
    #[ApiParameterRef(PbxSettings::MAIL_ENABLE_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_VOICEMAIL_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_LOGIN_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::SEND_SYSTEM_NOTIFICATIONS)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_PROVIDER)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_CLIENT_ID)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_CLIENT_SECRET)]
    #[ApiParameterRef(PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN)]
    #[ApiParameterRef(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL)]
    #[ApiParameterRef(PbxSettings::SYSTEM_EMAIL_FOR_MISSED)]
    #[ApiParameterRef(PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL)]
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
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_HOST)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PORT)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_USERNAME)]
    #[ApiParameterRef(PbxSettings::MAIL_SMTP_PASSWORD)]
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
    #[ApiParameterRef('to', required: true)]
    #[ApiParameterRef('subject')]
    #[ApiParameterRef('body')]
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
    #[ApiParameterRef('provider', required: true)]
    #[ApiParameterRef('redirect_uri')]
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
    #[ApiParameterRef('provider')]
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
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
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\MailSettingsManagementProcessor;

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
        'GET' => ['getList', 'getOAuth2Url'],
        'POST' => ['testConnection', 'sendTestEmail', 'refreshToken'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['reset']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getList', 'update', 'patch', 'reset'],
    customMethods: ['getOAuth2Url', 'testConnection', 'sendTestEmail', 'refreshToken'],
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
    #[ApiOperation(
        summary: 'Get mail settings',
        description: 'Retrieve current SMTP configuration and authentication settings',
        operationId: 'getMailSettings'
    )]
    #[ApiResponse(200, 'Mail settings retrieved successfully', example: '{"result":true,"data":{"MailSMTPHost":"smtp.gmail.com","MailSMTPPort":"587","MailSMTPAuthType":"oauth2","MailSMTPUsername":"admin@company.com","MailSMTPUseTLS":"1","MailFromUsername":"PBX System","MailFromAddress":"admin@company.com","MailEnableNotifications":"1"}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::READ)]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update mail settings (full replacement)
     *
     * @route PUT /pbxcore/api/v3/mail-settings
     */
    #[ApiOperation(
        summary: 'Update mail settings',
        description: 'Replace all mail configuration settings. All fields will be updated.',
        operationId: 'updateMailSettings'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'SMTP server hostname', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'smtp.gmail.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'SMTP server port', ParameterLocation::QUERY, required: true, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPAuthType', 'string', 'Authentication method', ParameterLocation::QUERY, required: false, enum: ['none', 'plain', 'login', 'oauth2'], default: 'none', example: 'oauth2')]
    #[ApiParameter('MailSMTPUsername', 'string', 'SMTP username/email', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('MailSMTPPassword', 'string', 'SMTP password (for plain/login auth)', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'password123')]
    #[ApiParameter('MailSMTPUseTLS', 'boolean', 'Use TLS encryption', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiParameter('MailFromUsername', 'string', 'Sender display name', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'PBX System')]
    #[ApiParameter('MailFromAddress', 'string', 'Sender email address', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('MailEnableNotifications', 'boolean', 'Enable email notifications', ParameterLocation::QUERY, required: false, default: true, example: true)]
    #[ApiResponse(200, 'Mail settings updated successfully', example: '{"result":true,"data":{"MailSMTPHost":"smtp.gmail.com","MailSMTPPort":"587","MailSMTPAuthType":"oauth2"},"messages":["Settings updated successfully"]}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse', example: '{"result":false,"messages":{"error":["MailSMTPHost is required","Invalid port number"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update mail settings
     *
     * @route PATCH /pbxcore/api/v3/mail-settings
     */
    #[ApiOperation(
        summary: 'Patch mail settings',
        description: 'Partially update mail configuration. Only provided fields will be modified.',
        operationId: 'patchMailSettings'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'SMTP server hostname', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'smtp.outlook.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'SMTP server port', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPAuthType', 'string', 'Authentication method', ParameterLocation::QUERY, required: false, enum: ['none', 'plain', 'login', 'oauth2'], example: 'oauth2')]
    #[ApiParameter('MailEnableNotifications', 'boolean', 'Enable email notifications', ParameterLocation::QUERY, required: false, example: false)]
    #[ApiResponse(200, 'Mail settings patched successfully', example: '{"result":true,"data":{"MailSMTPHost":"smtp.outlook.com","MailSMTPAuthType":"oauth2"},"messages":["Settings updated successfully"]}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
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
        summary: 'Reset mail settings',
        description: 'Reset all mail configuration to default values. This action cannot be undone.',
        operationId: 'resetMailSettings'
    )]
    #[ApiResponse(200, 'Mail settings reset successfully', example: '{"result":true,"messages":["Mail settings reset to defaults"]}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
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
        summary: 'Test SMTP connection',
        description: 'Test SMTP connection with current or provided configuration settings',
        operationId: 'testMailConnection'
    )]
    #[ApiParameter('MailSMTPHost', 'string', 'SMTP server to test (optional, uses current if not provided)', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'smtp.gmail.com')]
    #[ApiParameter('MailSMTPPort', 'integer', 'SMTP port to test', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 65535, example: 587)]
    #[ApiParameter('MailSMTPUsername', 'string', 'Username for test', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'test@company.com')]
    #[ApiParameter('MailSMTPPassword', 'string', 'Password for test', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'testpassword')]
    #[ApiResponse(200, 'Connection test completed', example: '{"result":true,"data":{"connection_status":"success","response_time_ms":234,"server_info":"220 smtp.gmail.com ESMTP"},"messages":["SMTP connection successful"]}')]
    #[ApiResponse(400, 'Connection test failed', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Failed to connect to SMTP server: Connection refused"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
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
        summary: 'Send test email',
        description: 'Send a test email using current mail configuration to verify settings',
        operationId: 'sendTestEmail'
    )]
    #[ApiParameter('to', 'string', 'Recipient email address', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'admin@company.com')]
    #[ApiParameter('subject', 'string', 'Email subject line', ParameterLocation::QUERY, required: false, maxLength: 255, default: 'MikoPBX Test Email', example: 'Test Email from PBX')]
    #[ApiParameter('body', 'string', 'Email body content', ParameterLocation::QUERY, required: false, maxLength: 5000, default: 'This is a test email from MikoPBX system.', example: 'Test message to verify mail configuration.')]
    #[ApiResponse(200, 'Test email sent successfully', example: '{"result":true,"data":{"message_id":"<abc123@company.com>","sent_to":"admin@company.com"},"messages":["Test email sent successfully"]}')]
    #[ApiResponse(400, 'Failed to send email', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Failed to send email: SMTP authentication failed"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
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
        summary: 'Get OAuth2 authorization URL',
        description: 'Generate OAuth2 authorization URL for mail provider (Gmail, Outlook, etc.)',
        operationId: 'getOAuth2AuthUrl'
    )]
    #[ApiParameter('provider', 'string', 'OAuth2 provider', ParameterLocation::QUERY, required: true, enum: ['google', 'microsoft', 'yahoo'], example: 'google')]
    #[ApiParameter('redirect_uri', 'string', 'OAuth2 redirect URI', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'https://pbx.company.com/pbxcore/api/v3/mail-settings/oauth2-callback')]
    #[ApiResponse(200, 'OAuth2 URL generated successfully', example: '{"result":true,"data":{"auth_url":"https://accounts.google.com/o/oauth2/auth?client_id=123&redirect_uri=...","state":"random_state_string","provider":"google"},"messages":["Authorization URL generated"]}')]
    #[ApiResponse(400, 'Invalid provider or configuration', 'ErrorResponse', example: '{"result":false,"messages":{"error":["OAuth2 not configured for provider: unknown_provider"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::READ)]
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
        summary: 'Refresh OAuth2 token',
        description: 'Refresh expired OAuth2 access token using stored refresh token',
        operationId: 'refreshOAuth2Token'
    )]
    #[ApiParameter('provider', 'string', 'OAuth2 provider to refresh token for', ParameterLocation::QUERY, required: false, enum: ['google', 'microsoft', 'yahoo'], example: 'google')]
    #[ApiResponse(200, 'Token refreshed successfully', example: '{"result":true,"data":{"access_token":"new_access_token","expires_in":3600,"token_type":"Bearer"},"messages":["OAuth2 token refreshed successfully"]}')]
    #[ApiResponse(400, 'Token refresh failed', 'ErrorResponse', example: '{"result":false,"messages":{"error":["Failed to refresh token: Invalid refresh token"]}}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('mail_settings', ActionType::WRITE)]
    public function refreshToken(): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Override action mapping for singleton resource behavior
     * MailSettings is a singleton - there's only one set of settings
     *
     * @return array<string, array<string, string>>
     */
    protected function getActionMapping(): array
    {
        return [
            'GET' => [
                'collection' => 'getList',
                'resource' => 'getList'  // Singleton: same action for both
            ],
            'POST' => [
                'collection' => 'create',  // Not used for singleton, but required for custom methods
                'resource' => 'create'
            ],
            'PUT' => [
                'collection' => 'update',
                'resource' => 'update'
            ],
            'PATCH' => [
                'collection' => 'patch',
                'resource' => 'patch'
            ],
            'DELETE' => [
                'collection' => 'reset',  // Reset to defaults
                'resource' => 'reset'
            ]
        ];
    }
}
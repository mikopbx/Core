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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\MailSettings;

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for mail settings (singleton resource)
 *
 * Provides OpenAPI schemas for mail server configuration including
 * SMTP settings, OAuth2 authentication, and connection testing.
 * This is a singleton resource - there's only one mail configuration.
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Format mail settings data for API response
     *
     * @param array<string, mixed> $data Raw mail settings data
     * @return array<string, mixed> Formatted mail settings structure
     */
    public static function formatMailSettings(array $data): array
    {
        // Apply OpenAPI schema formatting
        return self::formatBySchema($data, 'detail');
    }

    /**
     * Get OpenAPI schema for mail settings list (singleton)
     *
     * For singleton resources, list and detail schemas are identical.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get OpenAPI schema for detailed mail settings record
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['MailSMTPHost', 'MailSMTPPort', 'MailFromAddress'],
            'properties' => [
                'MailSMTPHost' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_smtp_host',
                    'maxLength' => 255,
                    'example' => 'smtp.gmail.com'
                ],
                'MailSMTPPort' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ms_smtp_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'default' => 587,
                    'example' => 587
                ],
                'MailSMTPAuthType' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_auth_type',
                    'enum' => ['none', 'plain', 'login', 'oauth2'],
                    'default' => 'none',
                    'example' => 'oauth2'
                ],
                'MailSMTPUsername' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_username',
                    'maxLength' => 255,
                    'example' => 'admin@company.com'
                ],
                'MailSMTPPassword' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_password',
                    'maxLength' => 255,
                    'format' => 'password',
                    'example' => 'password123'
                ],
                'MailSMTPUseTLS' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ms_use_tls',
                    'default' => true,
                    'example' => true
                ],
                'MailFromUsername' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_from_username',
                    'maxLength' => 255,
                    'example' => 'PBX System'
                ],
                'MailFromAddress' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_from_address',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'admin@company.com'
                ],
                'MailEnableNotifications' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ms_enable_notifications',
                    'default' => true,
                    'example' => true
                ],
                // OAuth2 specific fields
                'MailSMTPOAuth2ClientId' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_client_id',
                    'maxLength' => 500,
                    'example' => '123456789-abcdefg.apps.googleusercontent.com'
                ],
                'MailSMTPOAuth2ClientSecret' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_client_secret',
                    'maxLength' => 500,
                    'format' => 'password',
                    'example' => 'GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz'
                ],
                'MailSMTPOAuth2RefreshToken' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_refresh_token',
                    'maxLength' => 1000,
                    'format' => 'password',
                    'example' => '1//0gABC...'
                ],
                'MailSMTPOAuth2Provider' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_provider',
                    'enum' => ['gmail', 'outlook', 'custom'],
                    'example' => 'gmail'
                ],
                // Status fields (read-only)
                'connectionStatus' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_connection_status',
                    'enum' => ['not_tested', 'success', 'failed'],
                    'example' => 'success'
                ],
                'lastTestDate' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_last_test_date',
                    'format' => 'date-time',
                    'example' => '2025-01-20 10:30:00'
                ],
                'errorMessage' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_error_message',
                    'example' => ''
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'MailTestResult' => [
                'type' => 'object',
                'properties' => [
                    'success' => [
                        'type' => 'boolean',
                        'description' => 'rest_schema_ms_test_success',
                        'example' => true
                    ],
                    'message' => [
                        'type' => 'string',
                        'description' => 'rest_schema_ms_test_message',
                        'example' => 'Connection successful'
                    ],
                    'details' => [
                        'type' => 'object',
                        'description' => 'rest_schema_ms_test_details',
                        'additionalProperties' => true
                    ]
                ]
            ],
            'OAuth2Url' => [
                'type' => 'object',
                'properties' => [
                    'authUrl' => [
                        'type' => 'string',
                        'description' => 'rest_schema_ms_oauth2_url',
                        'format' => 'uri',
                        'example' => 'https://accounts.google.com/o/oauth2/auth?...'
                    ],
                    'state' => [
                        'type' => 'string',
                        'description' => 'rest_schema_ms_oauth2_state',
                        'example' => 'random_state_string'
                    ]
                ]
            ]
        ];
    }

    /**
     * Generate sanitization rules automatically from controller attributes
     *
     * Uses ParameterSanitizationExtractor to extract rules from #[ApiParameter] attributes.
     * This ensures Single Source of Truth - rules defined only in controller attributes.
     *
     * For singleton resources like MailSettings, we extract from the 'update' method.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        return \MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor::extractFromController(
            \MikoPBX\PBXCoreREST\Controllers\MailSettings\RestController::class,
            'update'
        );
    }

    /**
     * Format data by OpenAPI schema
     *
     * Helper method to apply schema formatting.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type ('list' or 'detail')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType): array
    {
        // Get the appropriate schema
        $schema = $schemaType === 'list'
            ? static::getListItemSchema()
            : static::getDetailSchema();

        if (!isset($schema['properties'])) {
            return $data;
        }

        // Apply type conversions based on schema
        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            if (!isset($data[$fieldName])) {
                continue;
            }

            $type = $fieldSchema['type'] ?? 'string';
            $value = $data[$fieldName];

            // Convert types according to schema
            $data[$fieldName] = match ($type) {
                'integer' => (int)$value,
                'number' => (float)$value,
                'boolean' => (bool)$value,
                'array' => is_array($value) ? $value : [],
                default => (string)$value
            };
        }

        return $data;
    }
}

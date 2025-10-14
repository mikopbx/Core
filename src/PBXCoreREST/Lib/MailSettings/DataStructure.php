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

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
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
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
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
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by MailSettings endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response-only fields (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'required' => ['MailSMTPHost', 'MailSMTPPort', 'MailFromAddress'],
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes mail settings parameter definitions.
     * MailSettings is a singleton resource for SMTP and OAuth2 configuration.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // SMTP basic settings
                'MailSMTPHost' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_smtp_host',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'required' => true,
                    'example' => 'smtp.gmail.com'
                ],
                'MailSMTPPort' => [
                    'type' => 'integer',
                    'description' => 'rest_param_ms_smtp_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'default' => 587,
                    'sanitize' => 'int',
                    'required' => true,
                    'example' => 587
                ],
                'MailSMTPAuthType' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_auth_type',
                    'enum' => ['none', 'plain', 'login', 'oauth2'],
                    'default' => 'none',
                    'sanitize' => 'string',
                    'example' => 'oauth2'
                ],
                'MailSMTPUsername' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_username',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'admin@company.com'
                ],
                'MailSMTPPassword' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_password',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'password123'
                ],
                'MailSMTPUseTLS' => [
                    'type' => 'boolean',
                    'description' => 'rest_param_ms_use_tls',
                    'default' => true,
                    'sanitize' => 'bool',
                    'example' => true
                ],
                // From settings
                'MailFromUsername' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_from_username',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'PBX System'
                ],
                'MailFromAddress' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_from_address',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'required' => true,
                    'example' => 'admin@company.com'
                ],
                'MailEnableNotifications' => [
                    'type' => 'boolean',
                    'description' => 'rest_param_ms_enable_notifications',
                    'default' => true,
                    'sanitize' => 'bool',
                    'example' => true
                ],
                // OAuth2 settings
                'MailSMTPOAuth2ClientId' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_client_id',
                    'maxLength' => 500,
                    'sanitize' => 'string',
                    'example' => '123456789-abcdefg.apps.googleusercontent.com'
                ],
                'MailSMTPOAuth2ClientSecret' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_client_secret',
                    'maxLength' => 500,
                    'sanitize' => 'string',
                    'example' => 'GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz'
                ],
                'MailSMTPOAuth2RefreshToken' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_refresh_token',
                    'maxLength' => 1000,
                    'sanitize' => 'string',
                    'example' => '1//0gABC...'
                ],
                'MailSMTPOAuth2Provider' => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_provider',
                    'enum' => ['gmail', 'outlook', 'custom'],
                    'sanitize' => 'string',
                    'example' => 'gmail'
                ]
            ],
            'response' => [
                // All mail settings fields (with rest_schema_* keys)
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
            ],
            // ========== RELATED SCHEMAS ==========
            // Nested object schemas for test results and OAuth2 URLs
            'related' => [
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
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

    /**
     * Format data by OpenAPI schema
     *
     * Helper method to apply schema formatting.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type ('list' or 'detail')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
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

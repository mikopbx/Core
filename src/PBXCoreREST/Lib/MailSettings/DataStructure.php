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

use MikoPBX\Common\Models\PbxSettings;
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
     * Validate email fields based on schema definitions
     *
     * WHY: Single Source of Truth for email validation.
     * Centralizes email validation logic instead of duplicating in actions.
     *
     * @param array<string, mixed> $data Data to validate
     * @return array Validation result with 'valid' boolean and 'messages' array
     */
    public static function validateEmailFields(array $data): array
    {
        $errors = [];
        $definitions = self::getParameterDefinitions();

        // Get all fields that have email format
        $emailFields = [];
        foreach ($definitions['request'] as $key => $definition) {
            if (isset($definition['format']) && $definition['format'] === 'email') {
                $emailFields[$key] = $definition['description'] ?? $key;
            }
        }

        // Validate each email field
        foreach ($emailFields as $field => $fieldName) {
            if (!isset($data[$field]) || empty($data[$field])) {
                // Email fields are optional unless marked as required
                if (isset($definitions['request'][$field]['required']) &&
                    $definitions['request'][$field]['required'] === true) {
                    $errors[] = "{$fieldName} is required";
                }
                continue;
            }

            $value = $data[$field];

            // Check for placeholder values that should not be saved
            $placeholders = ['_@_._', '@', '_@_', '___@___.___'];
            if (in_array($value, $placeholders, true)) {
                $errors[] = "{$fieldName} contains invalid placeholder value. Please enter a valid email or leave empty.";
                continue;
            }

            // Validate email format using PHP filter
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "{$fieldName} is not a valid email address: {$value}";
            }

            // Check maxLength if specified
            if (isset($definitions['request'][$field]['maxLength']) &&
                strlen($value) > $definitions['request'][$field]['maxLength']) {
                $errors[] = "{$fieldName} exceeds maximum length of {$definitions['request'][$field]['maxLength']} characters";
            }
        }

        return [
            'valid' => empty($errors),
            'messages' => $errors
        ];
    }

    /**
     * Get all mail setting keys that should be managed
     *
     * WHY: Single Source of Truth for mail settings.
     * Used by UpdateRecordAction and other classes to know which settings to process.
     *
     * @return array<string> Array of PbxSettings constants for mail settings
     */
    public static function getAllMailSettingKeys(): array
    {
        // Get all keys from parameter definitions
        $definitions = self::getParameterDefinitions();
        $keys = [];

        // Extract keys from request parameters
        if (isset($definitions['request'])) {
            $keys = array_merge($keys, array_keys($definitions['request']));
        }

        // Extract keys from response parameters (excluding computed fields)
        if (isset($definitions['response'])) {
            foreach ($definitions['response'] as $key => $definition) {
                // Skip computed/status fields that aren't actual settings
                if (in_array($key, ['connectionStatus', 'lastTestDate', 'errorMessage'], true)) {
                    continue;
                }
                $keys[] = $key;
            }
        }

        // Add OAuth2 internal fields (tokens)
        $oauthInternalKeys = [
            PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN,
            PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES,
        ];


        // Merge all keys and remove duplicates
        $allKeys = array_unique(array_merge($keys, $oauthInternalKeys));

        // Return only valid PbxSettings constants
        return array_values($allKeys);
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
            'required' => [PbxSettings::MAIL_SMTP_HOST, PbxSettings::MAIL_SMTP_PORT, PbxSettings::MAIL_SMTP_SENDER_ADDRESS],
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
     * Get default value for a field from Single Source of Truth
     *
     * WHY: Eliminates duplication by using PbxSettingsDefaultValuesTrait.
     * Ensures consistency across the entire application.
     *
     * @param string $fieldName The PbxSettings constant name
     * @return mixed The default value from PbxSettingsDefaultValuesTrait
     */
    public static function getDefaultValue(string $fieldName): mixed
    {
        $defaults = PbxSettings::getDefaultArrayValues();
        return $defaults[$fieldName] ?? null;
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
                PbxSettings::MAIL_SMTP_HOST => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_smtp_host',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'required' => true,
                    'example' => 'smtp.gmail.com'
                ],
                PbxSettings::MAIL_SMTP_PORT => [
                    'type' => 'integer',
                    'description' => 'rest_param_ms_smtp_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'default' => (int)self::getDefaultValue(PbxSettings::MAIL_SMTP_PORT),
                    'sanitize' => 'int',
                    'required' => true,
                    'example' => (int)self::getDefaultValue(PbxSettings::MAIL_SMTP_PORT)
                ],
                PbxSettings::MAIL_SMTP_AUTH_TYPE => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_auth_type',
                    'enum' => ['none', 'plain', 'login', 'oauth2'],
                    'default' => self::getDefaultValue(PbxSettings::MAIL_SMTP_AUTH_TYPE),
                    'sanitize' => 'string',
                    'example' => self::getDefaultValue(PbxSettings::MAIL_SMTP_AUTH_TYPE)
                ],
                PbxSettings::MAIL_SMTP_USERNAME => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_username',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'admin@company.com'
                ],
                PbxSettings::MAIL_SMTP_PASSWORD => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_password',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'password123'
                ],
                /** Encryption type: 'none', 'tls', 'ssl' (backward compatible with '0'/'1' boolean values) */
                PbxSettings::MAIL_SMTP_USE_TLS => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_use_tls',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS),
                    'sanitize' => 'string',
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS)
                ],
                PbxSettings::MAIL_SMTP_CERT_CHECK => [
                    'type' => 'boolean',
                    'description' => 'rest_param_ms_cert_check',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_CERT_CHECK),
                    'sanitize' => 'bool',
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_CERT_CHECK)
                ],
                // From settings
                PbxSettings::MAIL_SMTP_FROM_USERNAME => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_from_username',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'PBX System'
                ],
                PbxSettings::MAIL_SMTP_SENDER_ADDRESS => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_from_address',
                    'format' => 'email',
                    'maxLength' => 255,
                    'sanitize' => 'email',
                    'required' => true,
                    'example' => 'admin@company.com'
                ],
                PbxSettings::MAIL_ENABLE_NOTIFICATIONS => [
                    'type' => 'boolean',
                    'description' => 'rest_param_ms_enable_notifications',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_ENABLE_NOTIFICATIONS),
                    'sanitize' => 'bool',
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_ENABLE_NOTIFICATIONS)
                ],
                // OAuth2 settings
                PbxSettings::MAIL_OAUTH2_CLIENT_ID => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_client_id',
                    'maxLength' => 500,
                    'sanitize' => 'string',
                    'example' => '123456789-abcdefg.apps.googleusercontent.com'
                ],
                PbxSettings::MAIL_OAUTH2_CLIENT_SECRET => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_client_secret',
                    'maxLength' => 500,
                    'sanitize' => 'string',
                    'example' => 'GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz'
                ],
                PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_refresh_token',
                    'maxLength' => 1000,
                    'sanitize' => 'string',
                    'example' => '1//0gABC...'
                ],
                PbxSettings::MAIL_OAUTH2_PROVIDER => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_oauth2_provider',
                    'enum' => ['google', 'microsoft', 'yandex'],
                    'sanitize' => 'string',
                    'example' => 'google'
                ],

                // Email notification recipients
                PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_system_notifications_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'sanitize' => 'email',
                    'example' => self::getDefaultValue(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL)
                ],
                PbxSettings::SYSTEM_EMAIL_FOR_MISSED => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_missed_calls_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'sanitize' => 'email',
                    'example' => self::getDefaultValue(PbxSettings::SYSTEM_EMAIL_FOR_MISSED)
                ],
                PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL => [
                    'type' => 'string',
                    'description' => 'rest_param_ms_voicemail_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'sanitize' => 'email',
                    'example' => self::getDefaultValue(PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL)
                ],
                PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_missed_call_subject',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT)
                ],
                PbxSettings::MAIL_TPL_MISSED_CALL_BODY=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_missed_call_body',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_BODY),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_BODY)
                ],
                PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_missed_call_footer',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER)
                ],
                PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_voicemail_subject',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT)
                ],
                PbxSettings::MAIL_TPL_VOICEMAIL_BODY=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_voicemail_body',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_BODY),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_BODY)
                ],
                PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER=>[
                    'type' => 'string',
                    'description' => 'rest_param_ms_voicemail_footer',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'default' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER)
                ],
            ],
            'response' => [
                // All mail settings fields (with rest_schema_* keys)
                PbxSettings::MAIL_SMTP_HOST => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_smtp_host',
                    'maxLength' => 255,
                    'example' => 'smtp.gmail.com'
                ],
                PbxSettings::MAIL_SMTP_PORT => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ms_smtp_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'default' => (int)self::getDefaultValue(PbxSettings::MAIL_SMTP_PORT),
                    'example' => (int)self::getDefaultValue(PbxSettings::MAIL_SMTP_PORT)
                ],
                PbxSettings::MAIL_SMTP_AUTH_TYPE => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_auth_type',
                    'enum' => ['password', 'oauth2'],
                    'default' => self::getDefaultValue(PbxSettings::MAIL_SMTP_AUTH_TYPE),
                    'example' => self::getDefaultValue(PbxSettings::MAIL_SMTP_AUTH_TYPE)
                ],
                PbxSettings::MAIL_SMTP_USERNAME => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_username',
                    'maxLength' => 255,
                    'example' => 'admin@company.com'
                ],
                PbxSettings::MAIL_SMTP_PASSWORD => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_password',
                    'maxLength' => 255,
                    'format' => 'password',
                    'example' => 'password123'
                ],
                PbxSettings::MAIL_SMTP_USE_TLS => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ms_use_tls',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS),
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS)
                ],
                PbxSettings::MAIL_SMTP_CERT_CHECK => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ms_cert_check',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_CERT_CHECK),
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_CERT_CHECK)
                ],
                PbxSettings::MAIL_SMTP_FROM_USERNAME => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_from_username',
                    'maxLength' => 255,
                    'example' => 'PBX System'
                ],
                PbxSettings::MAIL_SMTP_SENDER_ADDRESS => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_from_address',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'admin@company.com'
                ],
                PbxSettings::MAIL_ENABLE_NOTIFICATIONS => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ms_enable_notifications',
                    'default' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS),
                    'example' => (bool)self::getDefaultValue(PbxSettings::MAIL_SMTP_USE_TLS)
                ],
                PbxSettings::MAIL_OAUTH2_CLIENT_ID => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_client_id',
                    'maxLength' => 500,
                    'example' => '123456789-abcdefg.apps.googleusercontent.com'
                ],
                PbxSettings::MAIL_OAUTH2_CLIENT_SECRET => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_client_secret',
                    'maxLength' => 500,
                    'format' => 'password',
                    'example' => 'GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz'
                ],
                PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_refresh_token',
                    'maxLength' => 1000,
                    'format' => 'password',
                    'example' => '1//0gABC...'
                ],
                PbxSettings::MAIL_OAUTH2_PROVIDER => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_oauth2_provider',
                    'enum' => ['google', 'microsoft', 'yandex'],
                    'example' => 'google'
                ],

                // Email notification recipients
                PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_system_notifications_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'admin@company.com'
                ],
                PbxSettings::SYSTEM_EMAIL_FOR_MISSED => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_missed_calls_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'manager@company.com'
                ],
                PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL => [
                    'type' => 'string',
                    'description' => 'rest_schema_ms_voicemail_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'voicemail@company.com'
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
     * Get field type from parameter definitions
     *
     * WHY: Provides Single Source of Truth for field types.
     * Used by API responses to properly format values.
     *
     * @param string $fieldName The PbxSettings constant name
     * @return string The field type ('string', 'integer', 'boolean', 'password')
     */
    public static function getFieldType(string $fieldName): string
    {
        $definitions = self::getParameterDefinitions();

        // Check in response section first (most complete)
        if (isset($definitions['response'][$fieldName])) {
            $fieldDef = $definitions['response'][$fieldName];
            $type = $fieldDef['type'] ?? 'string';

            // Check for password format in schema
            if (isset($fieldDef['format']) && $fieldDef['format'] === 'password') {
                return 'password';
            }

            return $type;
        }

        // Fallback to request section
        if (isset($definitions['request'][$fieldName])) {
            $fieldDef = $definitions['request'][$fieldName];
            $type = $fieldDef['type'] ?? 'string';

            // Check for password format
            if (isset($fieldDef['format']) && $fieldDef['format'] === 'password') {
                return 'password';
            }

            return $type;
        }

        // Default type based on naming convention
        if (str_contains(strtolower($fieldName), 'password') ||
            str_contains(strtolower($fieldName), 'secret') ||
            str_contains(strtolower($fieldName), 'token')) {
            return 'password';
        }

        return 'string';
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

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

namespace MikoPBX\PBXCoreREST\Lib\TimeSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for time settings (singleton resource)
 *
 * Provides OpenAPI schemas for time and timezone configuration.
 * This is a singleton resource - there's only one time configuration.
 *
 * @package MikoPBX\PBXCoreREST\Lib\TimeSettings
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get all time setting keys that should be managed
     *
     * WHY: Single Source of Truth for time settings.
     * Used by GetSettingsAction and UpdateSettingsAction.
     *
     * @return array<string> Array of PbxSettings constants for time settings
     */
    public static function getTimeSettingsKeys(): array
    {
        return [
            PbxSettings::PBX_TIMEZONE,
            PbxSettings::NTP_SERVER,
            PbxSettings::PBX_MANUAL_TIME_SETTINGS,
        ];
    }

    /**
     * Get OpenAPI schema for time settings list (singleton)
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
     * Get OpenAPI schema for detailed time settings record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        return [
            'type' => 'object',
            'properties' => $responseFields
        ];
    }

    /**
     * Get related schemas for OpenAPI components
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
     * @param string $fieldName The PbxSettings constant name
     * @return mixed The default value from PbxSettingsDefaultValuesTrait
     */
    public static function getDefaultValue(string $fieldName): mixed
    {
        $defaults = PbxSettings::getDefaultArrayValues();
        return $defaults[$fieldName] ?? null;
    }

    /**
     * Get field type from parameter definitions
     *
     * WHY: Provides Single Source of Truth for field types.
     * Used by API responses to properly format values.
     *
     * @param string $fieldName The field name (may be mapped)
     * @return string The field type ('string', 'integer', 'boolean')
     */
    public static function getFieldType(string $fieldName): string
    {
        $definitions = self::getParameterDefinitions();

        // Map API field names to PbxSettings keys
        $fieldMap = [
            'PBXTimezone' => PbxSettings::PBX_TIMEZONE,
            'NTPServer' => PbxSettings::NTP_SERVER,
            'PBXManualTimeSettings' => PbxSettings::PBX_MANUAL_TIME_SETTINGS,
            'ManualDateTime' => 'ManualDateTime',
            'CurrentDateTime' => 'CurrentDateTime'
        ];

        // Get the actual field key
        $actualField = $fieldMap[$fieldName] ?? $fieldName;

        // Check in response section
        if (isset($definitions['response'][$fieldName])) {
            return $definitions['response'][$fieldName]['type'] ?? 'string';
        }

        // Check in request section
        if (isset($definitions['request'][$actualField])) {
            return $definitions['request'][$actualField]['type'] ?? 'string';
        }

        // Default types based on field name
        if (str_contains(strtolower($fieldName), 'settings')) {
            return 'boolean';
        }

        return 'string';
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            PbxSettings::PBX_TIMEZONE => [
                'type' => 'string',
                'description' => 'rest_schema_ts_timezone',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'Europe/Moscow'
            ],
            PbxSettings::NTP_SERVER => [
                'type' => 'string',
                'description' => 'rest_schema_ts_ntp_server',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => "0.pool.ntp.org\n1.pool.ntp.org"
            ],
            PbxSettings::PBX_MANUAL_TIME_SETTINGS => [
                'type' => 'boolean',
                'description' => 'rest_schema_ts_manual_time',
                'sanitize' => 'bool',
                'default' => (bool)self::getDefaultValue(PbxSettings::PBX_MANUAL_TIME_SETTINGS),
                'example' => false
            ],
            'ManualDateTime' => [
                'type' => 'string',
                'description' => 'rest_schema_ts_manual_datetime',
                'format' => 'date-time',
                'sanitize' => 'string',
                'example' => '2025-01-20 15:30:00'
            ],
            // Response-only fields
            'PBXTimezone_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_ts_timezone_represent',
                'readOnly' => true,
                'example' => 'Europe/Moscow (UTC+03:00)'
            ],
            'CurrentDateTime' => [
                'type' => 'string',
                'description' => 'rest_schema_ts_current_datetime',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-01-20 15:30:00'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes time settings parameter definitions.
     * TimeSettings is a singleton resource for system time configuration.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and all fields (for response)
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        // Transform description keys for request section: rest_schema_* → rest_param_*
        $requestFields = [];
        foreach ($writableFields as $fieldName => $fieldDef) {
            $requestField = $fieldDef;
            $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
            $requestFields[$fieldName] = $requestField;
        }

        // For response section, use API field names instead of PbxSettings constants
        $responseFields = [
            // Map PbxSettings constants to API field names
            'PBXTimezone' => $allFields[PbxSettings::PBX_TIMEZONE],
            'PBXTimezone_represent' => $allFields['PBXTimezone_represent'],
            'NTPServer' => $allFields[PbxSettings::NTP_SERVER],
            'PBXManualTimeSettings' => $allFields[PbxSettings::PBX_MANUAL_TIME_SETTINGS],
            'ManualDateTime' => $allFields['ManualDateTime'],
            'CurrentDateTime' => $allFields['CurrentDateTime']
        ];

        return [
            'request' => $requestFields,
            'response' => $responseFields,
            'related' => [
                'TimezoneInfo' => [
                    'type' => 'object',
                    'properties' => [
                        'timezone' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ts_tz_identifier',
                            'example' => 'Europe/Moscow'
                        ],
                        'label' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ts_tz_label',
                            'example' => 'Europe/Moscow (UTC+03:00)'
                        ],
                        'offset' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_ts_tz_offset',
                            'example' => 10800
                        ]
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
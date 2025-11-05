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

namespace MikoPBX\PBXCoreREST\Lib\S3Storage;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for S3 storage settings (singleton resource)
 *
 * Provides OpenAPI schemas and validation rules for S3-compatible storage configuration.
 * This is a singleton resource - there's only one S3 configuration in the system.
 *
 * Single Source of Truth:
 * - All field definitions in getAllFieldDefinitions()
 * - Auto-generated sanitization rules
 * - Consistent request/response schemas
 * - OpenAPI documentation from field metadata
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage\S3
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for S3 settings list (singleton)
     *
     * For singleton resources, list and detail schemas are identical
     * since there's only one S3 configuration instance.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get OpenAPI schema for detailed S3 settings record
     *
     * Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * All response fields include full metadata (type, description, format, examples).
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
     * Returns additional schema definitions referenced by main schema
     * (e.g., nested objects, enums). Currently empty for S3 settings.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
    }

    /**
     * Get all S3 field definitions with complete metadata
     *
     * Single Source of Truth for ALL S3 field definitions.
     * Each field includes:
     * - type: Data type (string, integer, boolean)
     * - description: i18n key for field description
     * - validation: min/max, enum, pattern
     * - sanitize: Sanitization method
     * - example: Example value for documentation
     * - readOnly: Whether field is response-only
     *
     * @return array<string, mixed> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ============ S3 CONFIGURATION FIELDS ============

            's3_enabled' => [
                'type' => 'integer',
                'description' => 'rest_schema_s3_enabled',
                'enum' => [0, 1],
                'sanitize' => 'int',
                'default' => 0,
                'example' => 1
            ],

            's3_endpoint' => [
                'type' => 'string',
                'description' => 'rest_schema_s3_endpoint',
                'maxLength' => 255,
                'sanitize' => 'text',
                'example' => 'https://s3.amazonaws.com'
            ],

            's3_region' => [
                'type' => 'string',
                'description' => 'rest_schema_s3_region',
                'maxLength' => 50,
                'sanitize' => 'text',
                'default' => 'us-east-1',
                'example' => 'us-east-1'
            ],

            's3_bucket' => [
                'type' => 'string',
                'description' => 'rest_schema_s3_bucket',
                'minLength' => 3,
                'maxLength' => 63,
                'pattern' => '^[a-z0-9][a-z0-9-]*[a-z0-9]$',
                'sanitize' => 'text',
                'example' => 'mikopbx-recordings'
            ],

            's3_access_key' => [
                'type' => 'string',
                'description' => 'rest_schema_s3_access_key',
                'maxLength' => 128,
                'sanitize' => 'text',
                'example' => 'AKIAIOSFODNN7EXAMPLE'
            ],

            's3_secret_key' => [
                'type' => 'string',
                'description' => 'rest_schema_s3_secret_key',
                'maxLength' => 512,
                'sanitize' => 'text',
                'format' => 'password',
                'example' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
            ],

            // ============ RETENTION PERIOD FIELDS ============

            PbxSettings::PBX_RECORD_SAVE_PERIOD => [
                'type' => 'integer',
                'description' => 'rest_schema_s3_total_retention',
                'minimum' => 1,
                'maximum' => 3650,
                'sanitize' => 'int',
                'default' => 30,
                'example' => 30
            ],

            PbxSettings::PBX_RECORD_S3_LOCAL_DAYS => [
                'type' => 'integer',
                'description' => 'rest_schema_s3_local_retention',
                'minimum' => 1,
                'maximum' => 90,
                'sanitize' => 'int',
                'default' => 7,
                'example' => 7
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes S3 storage parameter definitions.
     * S3 Storage is a singleton resource for S3 configuration.
     *
     * Separates fields into:
     * - request: Writable fields for POST/PUT/PATCH (with rest_param_* descriptions)
     * - response: All fields for GET responses (with rest_schema_* descriptions)
     * - related: Additional schemas (currently empty)
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and response-only fields
        $writableFields = [];
        $responseFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                // Response-only fields keep rest_schema_* description
                $responseFields[$fieldName] = $fieldDef;
            } else {
                // Writable fields: add to both request (with rest_param_*) and response
                $requestField = $fieldDef;
                $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
                $writableFields[$fieldName] = $requestField;

                // All fields appear in response with schema description
                $responseFields[$fieldName] = $fieldDef;
            }
        }

        return [
            'request' => $writableFields,
            'response' => $responseFields,
            'related' => []
        ];
    }

    // ============ SANITIZATION RULES ============

    /**
     * Get sanitization rules for all fields
     *
     * WHY: Convert field definitions to simple string rules for sanitizeData()
     * Format: 'fieldname' => 'type|sanitize:rule|max:123'
     *
     * @return array<string, string> Sanitization rules as strings
     */
    public static function getSanitizationRules(): array
    {
        $allFields = self::getAllFieldDefinitions();
        $rules = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            $ruleParts = [];

            // Add type
            if (isset($fieldDef['type'])) {
                $ruleParts[] = $fieldDef['type'];
            }

            // Add sanitize method
            if (isset($fieldDef['sanitize'])) {
                $ruleParts[] = 'sanitize:' . $fieldDef['sanitize'];
            }

            // Add max length
            if (isset($fieldDef['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldDef['maxLength'];
            }

            // Add optional flag
            if (!isset($fieldDef['required']) || $fieldDef['required'] === false) {
                $ruleParts[] = 'optional';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }
}

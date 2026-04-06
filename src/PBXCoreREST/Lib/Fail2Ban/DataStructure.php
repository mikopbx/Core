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

namespace MikoPBX\PBXCoreREST\Lib\Fail2Ban;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Fail2Ban singleton resource
 *
 * Creates consistent data format for API responses.
 * Fail2Ban is a singleton resource - there's only one configuration in the system.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Fail2Ban
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from Fail2BanRules model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input.
     *
     * @param \MikoPBX\Common\Models\Fail2BanRules $model Fail2Ban rules model instance
     * @param string|null $maxReqPerSec Max requests per second from PbxSettings
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model, ?string $maxReqPerSec = null): array
    {
        // Get max requests per second if not provided
        if ($maxReqPerSec === null) {
            $maxReqPerSec = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_MAX_REQ);
        }

        $data = [
            'maxretry' => $model->maxretry,
            'bantime' => $model->bantime,
            'findtime' => $model->findtime,
            'whitelist' => $model->whitelist ?? '',
            'PBXFirewallMaxReqSec' => $maxReqPerSec,
        ];

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create default structure for new Fail2Ban configuration
     *
     * @return array<string, mixed> Default Fail2Ban data structure
     */
    public static function createDefault(): array
    {
        $data = [
            'maxretry' => 20,
            'bantime' => 600,
            'findtime' => 600,
            'whitelist' => '',
            'PBXFirewallMaxReqSec' => '100',
        ];

        return $data;
    }

    /**
     * Get OpenAPI schema for Fail2Ban singleton resource
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/fail2ban, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];

        $properties = [];

        // ✨ Inherit ALL request parameters (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            // Remove sanitization and validation-only properties
            unset($properties[$field]['sanitize'], $properties[$field]['required']);
        }

        return [
            'type' => 'object',
            'required' => ['maxretry', 'bantime', 'findtime'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for list (same as detail for singleton)
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
     * Get all field definitions (Single Source of Truth)
     *
     * WHY: Centralizes ALL field definitions for Fail2Ban resource in one place.
     * Each field is defined exactly once with all its constraints and metadata.
     * This eliminates duplication between request/response schemas.
     *
     * @return array<string, array<string, mixed>> All field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ========== WRITABLE FIELDS ==========
            'maxretry' => [
                'type' => 'integer',
                'description' => 'rest_schema_f2b_maxretry',
                'minimum' => 1,
                'maximum' => 100,
                'default' => 20,
                'sanitize' => 'int',
                'required' => true,
                'example' => 20
            ],
            'bantime' => [
                'type' => 'integer',
                'description' => 'rest_schema_f2b_bantime',
                'minimum' => 60,
                'default' => 600,
                'sanitize' => 'int',
                'required' => true,
                'example' => 600
            ],
            'findtime' => [
                'type' => 'integer',
                'description' => 'rest_schema_f2b_findtime',
                'minimum' => 60,
                'default' => 600,
                'sanitize' => 'int',
                'required' => true,
                'example' => 600
            ],
            'whitelist' => [
                'type' => 'string',
                'description' => 'rest_schema_f2b_whitelist',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '192.168.1.0/24,10.0.0.0/8'
            ],
            'PBXFirewallMaxReqSec' => [
                'type' => 'string',
                'description' => 'rest_schema_f2b_maxreqsec',
                'maxLength' => 10,
                'default' => '100',
                'sanitize' => 'string',
                'example' => '100'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes Fail2Ban parameter definitions.
     * Fail2Ban is a singleton resource - only one configuration exists.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and response-only fields
        $writableFields = [];
        $responseOnlyFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                $responseOnlyFields[$fieldName] = $fieldDef;
            } else {
                // For request section, use rest_param_* descriptions
                $requestField = $fieldDef;
                $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
                $writableFields[$fieldName] = $requestField;
            }
        }

        return [
            // ========== REQUEST PARAMETERS ==========
            // Used in API requests (POST, PUT, PATCH)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getListItemSchema() and getDetailSchema()
            'response' => $responseOnlyFields
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

}

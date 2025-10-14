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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for API keys with OpenAPI schema support
 *
 * Provides consistent data format for API key records in REST API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\ApiKeys
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data structure from model instance
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param ApiKeys $apiKey
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel($apiKey): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($apiKey);

        // Add API key specific fields
        $data['created_at'] = $apiKey->created_at ?? '';
        $data['last_used_at'] = $apiKey->last_used_at ?? '';
        $data['networkfilterid'] = !empty($apiKey->networkfilterid) ? $apiKey->networkfilterid : 'none';
        $data['key_display'] = $apiKey->key_display ?? '';
        $data['full_permissions'] = ($apiKey->full_permissions ?? '1') === '1';

        // Decode allowed_paths JSON field
        if (!empty($apiKey->allowed_paths)) {
            $decoded = json_decode($apiKey->allowed_paths, true);
            $data['allowed_paths'] = is_array($decoded) ? $decoded : [];
        } else {
            $data['allowed_paths'] = [];
        }

        // Add computed fields
        $data['has_key'] = !empty($apiKey->key_hash);
        $data['allowed_paths_count'] = count($data['allowed_paths']);

        // Add network filter representation using unified helper
        $data['networkfilter_represent'] = self::getNetworkFilterRepresentation($apiKey->networkfilterid);
        $data['has_network_filter'] = !empty($apiKey->networkfilterid) && $apiKey->networkfilterid !== 'none';

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields(), convertIntegerFields(), etc.
        // The schema defines which fields should be boolean, integer, or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }
    
    /**
     * Create minimal data structure for list view
     *
     * @param ApiKeys $apiKey
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($apiKey): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($apiKey);

        // Decode allowed_paths to count them
        $allowedPaths = [];
        if (!empty($apiKey->allowed_paths)) {
            $decoded = json_decode($apiKey->allowed_paths, true);
            if (is_array($decoded)) {
                $allowedPaths = $decoded;
            }
        }

        // Add API key specific fields for list display
        $data['created_at'] = $apiKey->created_at ?? '';
        $data['last_used_at'] = $apiKey->last_used_at ?? '';
        $data['allowed_paths_count'] = count($allowedPaths);
        $data['has_network_filter'] = !empty($apiKey->networkfilterid) && $apiKey->networkfilterid !== 'none';
        $data['has_key'] = !empty($apiKey->key_hash);
        $data['key_display'] = $apiKey->key_display ?? '';
        $data['full_permissions'] = ($apiKey->full_permissions ?? '1') === '1';

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }
    
    /**
     * Generate key display representation
     *
     * @param string $key The full API key
     * @return string Display representation (first 5...last 5)
     */
    public static function generateKeyDisplay(string $key): string
    {
        if (strlen($key) <= 15) {
            return $key;
        }

        return substr($key, 0, 5) . '...' . substr($key, -5);
    }

    /**
     * Get OpenAPI schema for API key list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/api-keys endpoint (list of API keys).
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!):
     * - Request parameters from 'request' section
     * - Response-only fields from 'response' section
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit request parameters used in list view
        $listFields = ['description', 'full_permissions'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'created_at', 'last_used_at', 'key_display', 'has_key',
                               'allowed_paths_count', 'has_network_filter', 'represent'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'description', 'created_at'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed API key record
     *
     * Uses getParameterDefinitions() as Single Source of Truth (NO duplication!).
     * Inherits ALL request parameters + response-only fields.
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/api-keys/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for detail view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            // Skip writeOnly fields (like 'key' which is never returned)
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = [
            'id',
            'created_at',
            'last_used_at',
            'key_display',
            'has_key',
            'allowed_paths_count',
            'has_network_filter',
            'networkfilter_represent',
            'represent'
        ];

        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'description', 'created_at'],
            'properties' => $properties
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields)
     *
     * Single Source of Truth for ALL definitions in API keys API.
     *
     * Structure:
     * - 'request': Request parameters (used in API requests, referenced by ApiParameterRef)
     * - 'response': Response-only fields (only in API responses, not in requests)
     *
     * This eliminates duplication between:
     * - Controller attributes (via ApiParameterRef)
     * - getListItemSchema() (inherits from here)
     * - getDetailSchema() (inherits from here)
     *
     * @return array<string, array<string, array<string, mixed>>> Field definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            // ========== REQUEST PARAMETERS ==========
            // Used in API requests (POST, PUT, PATCH)
            // Referenced by ApiParameterRef in Controller
            'request' => [
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_param_ak_description',
                    'minLength' => 1,
                    'maxLength' => 255,
                    'required' => true,
                    'example' => 'CRM Integration Key'
                ],
                'key' => [
                    'type' => 'string',
                    'description' => 'rest_param_ak_key',
                    'minLength' => 32,
                    'maxLength' => 255,
                    'required' => true, // Required for CREATE (auto-generated if not provided)
                    'writeOnly' => true, // Never returned in responses
                    'example' => 'miko_ak_1234567890abcdef1234567890abcdef'
                ],
                'networkfilterid' => [
                    'type' => 'string',
                    'description' => 'rest_param_ak_networkfilterid',
                    'pattern' => '^([0-9]+|none)$',
                    'default' => 'none',
                    'example' => '5'
                ],
                'full_permissions' => [
                    'type' => 'boolean',
                    'description' => 'rest_param_ak_full_permissions',
                    'default' => false,
                    'example' => false
                ],
                'allowed_paths' => [
                    'type' => 'array',
                    'description' => 'rest_param_ak_allowed_paths',
                    'items' => [
                        'type' => 'string',
                        'pattern' => '^/api/v[0-9]+/[a-z0-9-]+(/[a-z0-9-]+)*$',
                        'example' => '/api/v3/employees'
                    ],
                    'default' => [],
                    'example' => ['/api/v3/employees', '/api/v3/extensions']
                ]
            ],

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getListItemSchema() and getDetailSchema()
            'response' => [
                // ID field (used in both list and detail schemas)
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '12'
                ],

                // Timestamps
                'created_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'description' => 'rest_schema_ak_created_at',
                    'example' => '2025-01-15 10:30:00'
                ],
                'last_used_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'nullable' => true,
                    'description' => 'rest_schema_ak_last_used_at',
                    'example' => '2025-01-20 14:25:30'
                ],

                // Computed fields
                'key_display' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_key_display',
                    'example' => 'abcd1...xyz89'
                ],
                'has_key' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_key',
                    'example' => true
                ],
                'allowed_paths_count' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ak_allowed_paths_count',
                    'minimum' => 0,
                    'example' => 2
                ],
                'has_network_filter' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_network_filter',
                    'example' => true
                ],

                // Representation fields
                'networkfilter_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_networkfilter_represent',
                    'example' => '<i class="filter icon"></i> Office Network'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_represent',
                    'example' => '<i class="key icon"></i> CRM Integration Key'
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
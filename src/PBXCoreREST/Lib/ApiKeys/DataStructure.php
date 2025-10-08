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
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'description', 'created_at'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '12'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_description',
                    'maxLength' => 255,
                    'example' => 'CRM Integration Key'
                ],
                'created_at' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_created_at',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:00'
                ],
                'last_used_at' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_last_used_at',
                    'format' => 'date-time',
                    'nullable' => true,
                    'example' => '2025-01-20 14:25:30'
                ],
                'allowed_paths_count' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ak_allowed_paths_count',
                    'minimum' => 0,
                    'example' => 3
                ],
                'has_network_filter' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_network_filter',
                    'example' => true
                ],
                'has_key' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_key',
                    'example' => true
                ],
                'key_display' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_key_display',
                    'example' => 'abcd1...xyz89'
                ],
                'full_permissions' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_full_permissions',
                    'default' => false,
                    'example' => false
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_represent',
                    'example' => '<i class="key icon"></i> CRM Integration Key'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed API key record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/api-keys/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'description', 'created_at'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '12'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_description',
                    'maxLength' => 255,
                    'example' => 'CRM Integration Key'
                ],
                'created_at' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_created_at',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:00'
                ],
                'last_used_at' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_last_used_at',
                    'format' => 'date-time',
                    'nullable' => true,
                    'example' => '2025-01-20 14:25:30'
                ],
                'networkfilterid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_networkfilterid',
                    'pattern' => '^([0-9]+|none)$',
                    'default' => 'none',
                    'example' => '5'
                ],
                'networkfilter_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_networkfilter_represent',
                    'example' => '<i class="filter icon"></i> Office Network'
                ],
                'has_network_filter' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_network_filter',
                    'example' => true
                ],
                'key_display' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_key_display',
                    'example' => 'abcd1...xyz89'
                ],
                'allowed_paths' => [
                    'type' => 'array',
                    'description' => 'rest_schema_ak_allowed_paths',
                    'items' => [
                        'type' => 'string',
                        'pattern' => '^/api/v[0-9]+/[a-z-]+',
                        'example' => '/api/v3/employees'
                    ],
                    'example' => ['/api/v3/employees', '/api/v3/extensions']
                ],
                'allowed_paths_count' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ak_allowed_paths_count',
                    'minimum' => 0,
                    'example' => 2
                ],
                'has_key' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_has_key',
                    'example' => true
                ],
                'full_permissions' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ak_full_permissions',
                    'default' => false,
                    'example' => false
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ak_represent',
                    'example' => '<i class="key icon"></i> CRM Integration Key'
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
        return [];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * Converts OpenAPI schema constraints into SystemSanitizer format.
     * This eliminates duplication between schema definition and validation rules.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        $schema = static::getDetailSchema();
        $rules = [];

        if (!isset($schema['properties'])) {
            return $rules;
        }

        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            // Skip computed/read-only fields
            if (in_array($fieldName, ['allowed_paths_count', 'has_key', 'has_network_filter', 'key_display', 'represent', 'created_at', 'last_used_at', 'networkfilter_represent'])) {
                continue;
            }

            $ruleParts = [];

            // Add type
            $type = $fieldSchema['type'] ?? 'string';
            $ruleParts[] = match ($type) {
                'integer' => 'int',
                'number' => 'float',
                'boolean' => 'bool',
                'array' => 'array',
                default => 'string'
            };

            // Add constraints
            if (isset($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['pattern']) && is_string($fieldSchema['pattern'])) {
                $pattern = str_replace('^', '', $fieldSchema['pattern']);
                $pattern = str_replace('$', '', $pattern);
                $ruleParts[] = 'regex:/' . $pattern . '/';
            }
            if (isset($fieldSchema['nullable']) && $fieldSchema['nullable'] === true) {
                $ruleParts[] = 'empty_to_null';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }
}
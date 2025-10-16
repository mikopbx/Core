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

namespace MikoPBX\PBXCoreREST\Lib\Advice;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for system advice and notifications
 *
 * Provides OpenAPI schemas for system advice responses including security warnings,
 * configuration recommendations, and system health notifications.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Advice
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Format advice data for API response
     *
     * @param array<string, array<int, array<string, mixed>>> $adviceData Raw advice data from cache
     * @return array<string, mixed> Formatted advice structure
     */
    public static function formatAdviceData(array $adviceData): array
    {
        $data = ['advice' => $adviceData];

        // Apply OpenAPI schema formatting
        return self::formatBySchema($data, 'list');
    }

    /**
     * Get OpenAPI schema for advice list response
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by GetAdviceListAction.
     * Used for GET /api/v3/advice endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response-only fields (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        // Add example data to advice field
        if (isset($properties['advice'])) {
            $properties['advice']['example'] = [
                'security' => [
                    [
                        'messageTpl' => 'adv_weak_password_detected',
                        'messageParams' => ['extension' => '200'],
                        'severity' => 'warning',
                        'category' => 'security'
                    ]
                ],
                'configuration' => [
                    [
                        'messageTpl' => 'adv_voicemail_not_configured',
                        'messageParams' => [],
                        'severity' => 'info',
                        'category' => 'configuration'
                    ]
                ]
            ];
        }

        return [
            'type' => 'object',
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed advice record
     *
     * Since Advice is a read-only resource, detail schema is same as list.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return self::getListItemSchema();
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * Returns schemas for nested objects used in advice responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
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
            // Query parameters for filtering (Advice is read-only)
            'category' => [
                'type' => 'string',
                'description' => 'rest_schema_advice_category_filter',
                'enum' => ['security', 'configuration', 'performance', 'maintenance', 'updates'],
                'sanitize' => 'string',
                'example' => 'security'
            ],
            'severity' => [
                'type' => 'string',
                'description' => 'rest_schema_advice_severity_filter',
                'enum' => ['critical', 'warning', 'info'],
                'sanitize' => 'string',
                'example' => 'warning'
            ],
            'force' => [
                'type' => 'boolean',
                'description' => 'rest_schema_advice_force',
                'sanitize' => 'bool',
                'default' => false,
                'example' => true
            ],
            // Response-only fields
            'advice' => [
                'type' => 'object',
                'description' => 'rest_schema_advice_advice',
                'readOnly' => true,
                'additionalProperties' => [
                    'type' => 'array',
                    'items' => ['$ref' => '#/components/schemas/AdviceItem']
                ]
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes advice parameter definitions and nested schemas.
     * Advice is a read-only monitoring resource - no create/update operations.
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
            // Used in API requests (GET query parameters for filtering)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            'response' => $responseOnlyFields,

            // ========== RELATED SCHEMAS ==========
            // Nested object schemas referenced by $ref in OpenAPI
            'related' => [
                'AdviceItem' => [
                    'type' => 'object',
                    'required' => ['messageTpl', 'severity', 'category'],
                    'properties' => [
                        'messageTpl' => [
                            'type' => 'string',
                            'description' => 'rest_schema_advice_message_tpl',
                            'example' => 'adv_weak_password_detected'
                        ],
                        'messageParams' => [
                            'type' => 'object',
                            'description' => 'rest_schema_advice_message_params',
                            'additionalProperties' => true,
                            'example' => ['extension' => '200']
                        ],
                        'severity' => [
                            'type' => 'string',
                            'description' => 'rest_schema_advice_severity',
                            'enum' => ['critical', 'warning', 'info'],
                            'example' => 'warning'
                        ],
                        'category' => [
                            'type' => 'string',
                            'description' => 'rest_schema_advice_category',
                            'enum' => ['security', 'configuration', 'performance', 'maintenance', 'updates'],
                            'example' => 'security'
                        ]
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

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

namespace MikoPBX\PBXCoreREST\Lib\Search;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure definitions for global search API.
 *
 * Defines schema for search items including validation rules,
 * data types, and response formats.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Search
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get unified field definitions for search results (Single Source of Truth)
     *
     * WHY: Eliminates duplication and provides single definition for response schema.
     * Each field is defined ONCE with all its properties.
     *
     * @return array<string, array<string, mixed>> Unified field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_search_result_name',
                'example' => '<i class="user icon"></i> John Doe'
            ],
            'value' => [
                'type' => 'string',
                'description' => 'rest_schema_search_result_value',
                'example' => '/admin-cabinet/extensions/modify/201'
            ],
            'type' => [
                'type' => 'string',
                'description' => 'rest_schema_search_result_type',
                'example' => 'USERS'
            ],
            'typeLocalized' => [
                'type' => 'string',
                'description' => 'rest_schema_search_result_type_localized',
                'example' => 'Users'
            ],
            'sorter' => [
                'type' => 'string',
                'description' => 'rest_schema_search_result_sorter',
                'example' => 'John Doe'
            ]
        ];
    }

    /**
     * Get parameter definitions for global search
     *
     * WHY: Centralized definition of all request/response parameters.
     * Uses getAllFieldDefinitions() to avoid duplication.
     *
     * @return array{request: array<string, array>, response: array<string, array>}
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        return [
            'request' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'rest_param_search_query',
                    'in' => 'query',
                    'example' => '201',
                    'sanitize' => 'text',
                    'required' => false
                ]
            ],
            'response' => [
                'name' => [
                    'type' => 'array',
                    'description' => 'rest_schema_search_results',
                    'items' => [
                        'type' => 'object',
                        'properties' => $allFields
                    ]
                ]
            ]
        ];
    }

    /**
     * Get sanitization rules for request parameters
     *
     * WHY: Security - sanitize user input to prevent XSS and injection attacks.
     *
     * @return array<string, string>
     */
    public static function getSanitizationRules(): array
    {
        return [
            'query' => 'string|sanitize:text|empty_to_null'
        ];
    }

    /**
     * Get OpenAPI schema for list item representation
     *
     * WHY: Search results are always returned as list (array of search items).
     * Each item contains name, value, type, typeLocalized, and sorter fields.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();

        return [
            'type' => 'object',
            'description' => 'rest_schema_search_item',
            'properties' => $allFields,
            'required' => ['name', 'value', 'type']
        ];
    }

    /**
     * Get OpenAPI schema for detailed record representation
     *
     * WHY: Search endpoint returns list only (no detail view for individual items).
     * Return same schema as list item for consistency.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return self::getListItemSchema();
    }

    /**
     * Get related schemas that should be registered in OpenAPI components
     *
     * WHY: Search results don't have nested schemas - all fields are simple types.
     * Return empty array as there are no related schemas to register.
     *
     * @return array<string, array<string, mixed>> Map of schema name to schema definition
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }
}

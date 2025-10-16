<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\WikiLinks;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for wiki links responses
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create response data structure from URL
     *
     * @param string $url Documentation URL
     * @return array<string, mixed> Response data
     */
    public static function create(string $url): array
    {
        return self::formatBySchema(['url' => $url], 'detail');
    }

    /**
     * Get OpenAPI schema for wiki link response
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array<string, mixed> OpenAPI schema
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
            'required' => ['url'],
            'properties' => $properties
        ];
    }

    /**
     * Format data according to schema
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type ('detail' or 'list')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
    {
        $schema = match ($schemaType) {
            'detail' => self::getDetailSchema(),
            default => []
        };

        // Basic validation and type conversion
        $result = [];
        foreach ($schema['properties'] ?? [] as $key => $property) {
            if (isset($data[$key])) {
                $result[$key] = $data[$key];
            }
        }

        return $result;
    }

    /**
     * Get OpenAPI schema for list items (not used for this endpoint)
     *
     * @return array<string, mixed>
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
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
            // Request parameters
            'controller' => [
                'type' => 'string',
                'description' => 'rest_schema_wl_controller',
                'in' => 'query',
                'maxLength' => 255,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'Extensions'
            ],
            'action' => [
                'type' => 'string',
                'description' => 'rest_schema_wl_action',
                'in' => 'query',
                'maxLength' => 255,
                'sanitize' => 'string',
                'default' => 'index',
                'example' => 'index'
            ],
            'language' => [
                'type' => 'string',
                'description' => 'rest_schema_wl_language',
                'in' => 'query',
                'enum' => ['en', 'ru'],
                'sanitize' => 'string',
                'default' => 'en',
                'example' => 'en'
            ],
            'moduleId' => [
                'type' => 'string',
                'description' => 'rest_schema_wl_module_id',
                'in' => 'query',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'ModuleUsersUI'
            ],
            // Response-only fields
            'url' => [
                'type' => 'string',
                'description' => 'rest_schema_wl_url',
                'format' => 'uri',
                'readOnly' => true,
                'example' => 'https://docs.mikopbx.com/mikopbx/v/english/manual/telephony/extensions'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes wiki links parameter definitions.
     * WikiLinks is a utility resource that generates documentation URLs.
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
            // Used in API requests (GET query parameters)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            'response' => $responseOnlyFields,
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

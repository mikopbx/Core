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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for custom files
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from CustomFiles model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param CustomFiles $model Custom file model instance
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => $model->id,
            'filepath' => $model->filepath ?? '',
            'content' => $model->content ?? '', // Already base64 encoded in DB
            'mode' => $model->mode ?? CustomFiles::MODE_NONE,
            'description' => $model->description ?? '',
            'changed' => $model->changed ?? '0'
        ];
    }

    /**
     * Create simplified data structure for list view
     *
     * Optimized version for table display without heavy content field.
     *
     * @param CustomFiles $model Custom file model instance
     * @return array<string, mixed> Simplified data structure
     */
    public static function createForList($model): array
    {
        return [
            'id' => $model->id,
            'filepath' => $model->filepath ?? '',
            'mode' => $model->mode ?? CustomFiles::MODE_NONE,
            'description' => $model->description ?? '',
            'changed' => $model->changed ?? '0'
            // Content excluded for list view performance
        ];
    }

    /**
     * Get OpenAPI schema for custom file list item
     *
     * ✨ Inherits field definitions from getAllFieldDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/custom-files endpoint (list of custom files).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();
        $properties = [];

        // ✨ Include fields used in list view
        $listFields = ['id', 'filepath', 'mode', 'description', 'changed'];
        foreach ($listFields as $field) {
            if (isset($allFields[$field])) {
                $properties[$field] = $allFields[$field];
                // Remove sanitization and validation-only properties
                unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required'], $properties[$field]['readOnly']);
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'filepath', 'mode'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed custom file record
     *
     * ✨ Inherits field definitions from getAllFieldDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/custom-files/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();
        $properties = [];

        // ✨ Include ALL fields for detail view (NO duplication!)
        foreach ($allFields as $field => $definition) {
            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Remove sanitization and validation-only properties
            unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required'], $properties[$field]['readOnly']);
        }

        return [
            'type' => 'object',
            'required' => ['id', 'filepath', 'mode', 'content'],
            'properties' => $properties
        ];
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
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '15'
            ],
            'filepath' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_filepath',
                'minLength' => 1,
                'maxLength' => 500,
                'sanitize' => 'string',
                'required' => true,
                'example' => '/etc/asterisk/custom.conf'
            ],
            'content' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_content',
                'sanitize' => 'string',
                'required' => true,
                'example' => 'W2dlbmVyYWxdCmRlYnVnPXllcw=='
            ],
            'mode' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_mode',
                'enum' => ['override', 'append', 'script', 'none'],
                'sanitize' => 'string',
                'default' => 'none',
                'example' => 'append'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'default' => '',
                'example' => 'Custom Asterisk configuration'
            ],
            'changed' => [
                'type' => 'string',
                'description' => 'rest_schema_cf_changed',
                'enum' => ['0', '1'],
                'sanitize' => 'string',
                'default' => '0',
                'example' => '0'
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * Defines all field schemas, validation rules, defaults, and sanitization rules in one place.
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
            'request' => $writableFields,
            'response' => $responseOnlyFields,
            'related' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
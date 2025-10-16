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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for extension modules with complete metadata
 *
 * Creates consistent data format for API responses including all module
 * information needed for installation, configuration, and management.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;

    /**
     * Create data array from PbxExtensionModules model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\PbxExtensionModules $model Module model instance
     * @param array<string, mixed> $additionalData Additional metadata from module.json or repository
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model, array $additionalData = []): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add all module fields from model (raw values)
        $data['name'] = $model->name ?? '';
        $data['version'] = $model->version ?? '';
        $data['developer'] = $model->developer ?? '';
        $data['description'] = $model->description ?? '';
        $data['disabled'] = $model->disabled ?? '0';

        // Add path information
        $data['path'] = $model->path ?? '';

        // Merge with additional data from module.json or repository
        if (!empty($additionalData)) {
            $data = array_merge($data, $additionalData);
        }

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create data array for available module from repository
     *
     * @param array<string, mixed> $moduleData Module data from repository
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromRepositoryData(array $moduleData): array
    {
        $data = [
            'id' => $moduleData['uniqid'] ?? '',
            'name' => $moduleData['name'] ?? '',
            'version' => $moduleData['version'] ?? '',
            'developer' => $moduleData['developer'] ?? '',
            'description' => $moduleData['description'] ?? '',
            'installed' => false,
            'commercial' => $moduleData['commercial'] ?? false,
            'min_pbx_version' => $moduleData['min_pbx_version'] ?? '',
            'max_pbx_version' => $moduleData['max_pbx_version'] ?? '',
            'release_id' => $moduleData['release_id'] ?? 0,
            'download_url' => $moduleData['download_url'] ?? '',
            'md5' => $moduleData['md5'] ?? '',
        ];

        // Apply OpenAPI schema formatting
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for modules
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @param string $type Schema type ('list', 'detail', or 'default')
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getOpenApiSchema(string $type = 'detail'): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        // ✨ Inherit common fields (NO duplication!)
        $commonFields = ['id', 'name', 'version', 'developer', 'description', 'disabled'];
        $properties = [];
        foreach ($commonFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        if ($type === 'detail') {
            // ✨ Add detail-specific fields from response section
            $detailFields = ['path', 'min_pbx_version', 'max_pbx_version'];
            foreach ($detailFields as $field) {
                if (isset($responseFields[$field])) {
                    $properties[$field] = $responseFields[$field];
                }
            }

            return [
                'type' => 'object',
                'properties' => $properties,
                'required' => ['id', 'name', 'version']
            ];
        }

        if ($type === 'list') {
            // ✨ Add list-specific fields from response section
            $listFields = ['installed', 'commercial'];
            foreach ($listFields as $field) {
                if (isset($responseFields[$field])) {
                    $properties[$field] = $responseFields[$field];
                }
            }

            return [
                'type' => 'object',
                'properties' => $properties,
                'required' => ['id', 'name', 'version']
            ];
        }

        // default type - just common fields
        return [
            'type' => 'object',
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for list item representation
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getOpenApiSchema('list');
    }

    /**
     * Get OpenAPI schema for detailed record representation
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return self::getOpenApiSchema('detail');
    }

    /**
     * Get related schemas that should be registered in OpenAPI components
     *
     * @return array<string, array<string, mixed>> Map of schema name to schema definition
     */
    public static function getRelatedSchemas(): array
    {
        // No related schemas for modules
        return [];
    }

    /**
     * Get searchable fields for modules
     *
     * @return array<string> List of searchable field names
     */
    public static function getSearchableFields(): array
    {
        return [
            'name',
            'developer',
            'description',
            'uniqid'
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
            // Module identification
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_module_id',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'ModuleTemplate'
            ],
            'uniqid' => [
                'type' => 'string',
                'description' => 'rest_schema_module_uniqid',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'ModuleTemplate'
            ],
            // Module metadata
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_module_name',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'Module Template'
            ],
            'version' => [
                'type' => 'string',
                'description' => 'rest_schema_module_version',
                'maxLength' => 50,
                'sanitize' => 'string',
                'example' => '1.0.0'
            ],
            'developer' => [
                'type' => 'string',
                'description' => 'rest_schema_module_developer',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'MIKO LLC'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_module_description',
                'maxLength' => 1000,
                'sanitize' => 'string',
                'example' => 'Template module for developers'
            ],
            'disabled' => [
                'type' => 'boolean',
                'description' => 'rest_schema_module_disabled',
                'default' => false,
                'sanitize' => 'bool',
                'example' => false
            ],
            // Installation parameters
            'release_id' => [
                'type' => 'integer',
                'description' => 'rest_schema_module_release_id',
                'minimum' => 0,
                'sanitize' => 'int',
                'example' => 12345
            ],
            'filePath' => [
                'type' => 'string',
                'description' => 'rest_schema_module_file_path',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '/tmp/ModuleTemplate.zip'
            ],
            // Query parameters for list filtering
            'search' => [
                'type' => 'string',
                'description' => 'rest_schema_module_search',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'Template'
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'rest_schema_module_limit',
                'minimum' => 1,
                'maximum' => 100,
                'default' => 20,
                'sanitize' => 'int',
                'example' => 20
            ],
            'offset' => [
                'type' => 'integer',
                'description' => 'rest_schema_module_offset',
                'minimum' => 0,
                'default' => 0,
                'sanitize' => 'int',
                'example' => 0
            ],
            'order' => [
                'type' => 'string',
                'description' => 'rest_schema_module_order',
                'enum' => ['name', 'version', 'developer', 'disabled'],
                'default' => 'name',
                'sanitize' => 'string',
                'example' => 'name'
            ],
            // Response-only fields
            'path' => [
                'type' => 'string',
                'description' => 'rest_schema_module_path',
                'readOnly' => true,
                'example' => '/usr/www/src/Modules/ModuleTemplate'
            ],
            'min_pbx_version' => [
                'type' => 'string',
                'description' => 'rest_schema_module_min_pbx_version',
                'readOnly' => true,
                'example' => '2024.1.0'
            ],
            'max_pbx_version' => [
                'type' => 'string',
                'description' => 'rest_schema_module_max_pbx_version',
                'readOnly' => true,
                'example' => '2025.12.31'
            ],
            'installed' => [
                'type' => 'boolean',
                'description' => 'rest_schema_module_installed',
                'readOnly' => true,
                'example' => true
            ],
            'commercial' => [
                'type' => 'boolean',
                'description' => 'rest_schema_module_commercial',
                'readOnly' => true,
                'example' => false
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes module parameter definitions.
     * Modules resource handles module installation, configuration, and management.
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
            // Used by getOpenApiSchema() method
            'response' => $responseOnlyFields,
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

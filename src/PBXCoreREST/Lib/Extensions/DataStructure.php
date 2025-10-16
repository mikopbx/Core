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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for extensions
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from Extensions model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param Extensions $model Extension model instance
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = self::createBaseStructure($model);

        // Add all extension fields from model
        $data['id'] = $model->number;
        $data['number'] = $model->number;
        $data['type'] = $model->type ?? Extensions::TYPE_SIP;
        $data['callerid'] = $model->callerid ?? '';
        $data['userid'] = $model->userid ?? '';
        $data['show_in_phonebook'] = $model->show_in_phonebook ?? '1';
        $data['public_access'] = $model->public_access ?? '0';
        $data['is_general_user_number'] = $model->is_general_user_number ?? '1';

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data structure for list view
     *
     * @param Extensions $model Extension model instance
     * @return array<string, mixed> Simplified data structure
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Add extension specific fields for list display
        $data['id'] = $model->number;
        $data['number'] = $model->number;
        $data['type'] = $model->type ?? Extensions::TYPE_SIP;
        $data['callerid'] = $model->callerid ?? '';

        // Apply OpenAPI list schema formatting
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for extension list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/extensions endpoint (list of extensions).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'] ?? [];

        $properties = [];

        // ✨ Inherit request parameters used in list view
        $listFields = ['number', 'type', 'callerid'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'number', 'type'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed extension record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/extensions/{id}, POST, PUT, PATCH endpoints.
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'] ?? [];

        $properties = [];

        // ✨ Inherit ALL request parameters for detail view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            // Skip query parameters (limit, offset, search, order, orderWay)
            if (in_array($field, ['limit', 'offset', 'search', 'order', 'orderWay'])) {
                continue;
            }

            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = ['id'];
        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['number', 'type'],
            'properties' => $properties
        ];
    }

    /**
     * ✨ SINGLE SOURCE OF TRUTH - all fields defined once
     *
     * Centralizes ALL field definitions with their constraints, validation rules,
     * and sanitization. Eliminates duplication between request/response schemas.
     *
     * @return array<string, mixed>
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // Writable fields - accepted in POST/PUT/PATCH requests
            'number' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_number',
                'pattern' => '^[0-9]{2,8}$',
                'minLength' => 2,
                'maxLength' => 8,
                'sanitize' => 'string',
                'required' => true,
                'example' => '201'
            ],
            'type' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_type',
                'enum' => ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
                'default' => 'SIP',
                'sanitize' => 'string',
                'required' => true,
                'example' => 'SIP'
            ],
            'callerid' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_callerid',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'John Doe'
            ],
            'userid' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_userid',
                'pattern' => '^[0-9]*$',
                'sanitize' => 'string',
                'example' => '12'
            ],
            'show_in_phonebook' => [
                'type' => 'boolean',
                'description' => 'rest_schema_ext_show_in_phonebook',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            'public_access' => [
                'type' => 'boolean',
                'description' => 'rest_schema_ext_public_access',
                'default' => false,
                'sanitize' => 'bool',
                'example' => false
            ],
            'is_general_user_number' => [
                'type' => 'boolean',
                'description' => 'rest_schema_ext_is_general_user_number',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            // Query parameters for getList
            'limit' => [
                'type' => 'integer',
                'description' => 'rest_schema_ext_limit',
                'minimum' => 1,
                'maximum' => 100,
                'default' => 20,
                'sanitize' => 'int',
                'example' => 20
            ],
            'offset' => [
                'type' => 'integer',
                'description' => 'rest_schema_ext_offset',
                'minimum' => 0,
                'default' => 0,
                'sanitize' => 'int',
                'example' => 0
            ],
            'search' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_search',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => '200'
            ],
            'order' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_order',
                'enum' => ['number', 'type', 'callerid'],
                'default' => 'number',
                'sanitize' => 'string',
                'example' => 'number'
            ],
            'orderWay' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_orderWay',
                'enum' => ['ASC', 'DESC'],
                'default' => 'ASC',
                'sanitize' => 'string',
                'example' => 'ASC'
            ],

            // Read-only fields - only in responses, never accepted in requests
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_ext_id',
                'pattern' => '^[0-9]{2,8}$',
                'readOnly' => true,
                'example' => '201'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * Defines all field schemas, validation rules, defaults, and sanitization rules in one place.
     * This replaces legacy ParameterSanitizationExtractor pattern.
     *
     * ✨ Uses getAllFieldDefinitions() to eliminate duplication.
     *
     * WHY: Centralizes all extension parameter definitions in one place.
     * Includes both CRUD fields and query filtering parameters.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter out read-only fields for request schema
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        // Transform description keys for request parameters: rest_schema_* → rest_param_*
        $requestFields = [];
        foreach ($writableFields as $field => $definition) {
            $requestFields[$field] = $definition;
            $requestFields[$field]['description'] = str_replace('rest_schema_', 'rest_param_', $definition['description']);
        }

        return [
            'request' => $requestFields,
            'response' => $allFields  // ALL fields including read-only
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

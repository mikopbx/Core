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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for conference rooms with OpenAPI schema support
 *
 * Provides consistent data format for conference room records in REST API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\ConferenceRooms
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create full data array from ConferenceRooms model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * Used for detailed views and single record retrieval.
     * Uses uniqid as the primary identifier for clean API design.
     *
     * @param ConferenceRooms $model
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel($model): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add conference room specific fields
        $data['extension'] = $model->extension;
        $data['pinCode'] = $model->pinCode ?? '';

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields(), handleNullValues(), etc.
        // The schema defines which fields should be boolean, integer, or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create optimized data array for list view
     *
     * Returns data needed for list display.
     * Uses uniqid as the primary identifier for clean API design.
     *
     * @param ConferenceRooms $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add conference room specific fields for list display
        $data['extension'] = $model->extension;
        $data['pinCode'] = $model->pinCode ?? '';

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for conference room list item
     *
     * Uses getParameterDefinitions() as Single Source of Truth (NO duplication!).
     * Inherits request parameters + response-only fields.
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/conference-rooms endpoint (list of conference rooms).
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
        $listFields = ['extension', 'name', 'pinCode'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'represent'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed conference room record
     *
     * Uses getParameterDefinitions() as Single Source of Truth (NO duplication!).
     * Inherits ALL request parameters + response-only fields.
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/conference-rooms/{id}, POST, PUT, PATCH endpoints.
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
            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Conference rooms don't use nested schemas, so this returns empty array.
     *
     * @return array<string, array<string, mixed>> Related schemas (empty for this resource)
     */
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
                'description' => 'rest_schema_cr_id',
                'pattern' => '^CONFERENCE-[A-Z0-9]{8,32}$',
                'readOnly' => true,
                'example' => 'CONFERENCE-ABCD1234'
            ],
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_cr_name',
                'maxLength' => 100,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'Sales Conference'
            ],
            'extension' => [
                'type' => 'string',
                'description' => 'rest_schema_cr_extension',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'required' => true,
                'example' => '3000'
            ],
            'pinCode' => [
                'type' => 'string',
                'description' => 'rest_schema_cr_pincode',
                'maxLength' => 20,
                'sanitize' => 'string',
                'example' => '1234'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_cr_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => 'Weekly sales team conference'
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cr_represent',
                'readOnly' => true,
                'example' => '<i class="users icon"></i> Sales Conference <3000>'
            ],
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields)
     *
     * Single Source of Truth for ALL definitions in conference rooms API.
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
    // No need to override - uses getParameterDefinitions() automatically
}

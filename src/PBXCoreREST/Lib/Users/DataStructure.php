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


namespace MikoPBX\PBXCoreREST\Lib\Users;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Users
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Users
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{

    /**
     * Create data structure from model instance
     *
     * @param \MikoPBX\Common\Models\Users $model The Users model instance
     * @return array<string, mixed> The structured data array
     */
    public static function createFromModel($model): array
    {
        $data = self::createBaseStructure($model);
        $data['id'] = (int)$model->id;
        $data['email'] = $model->email ?? '';
        $data['username'] = $model->username ?? '';
        $data['language'] = $model->language ?? 'en';
        $data['avatar'] = $model->avatar ?? null;

        return $data;
    }

    /**
     * Create simplified data structure for list view
     *
     * @param \MikoPBX\Common\Models\Users $model The Users model instance
     * @return array<string, mixed> Simplified data structure
     */
    public static function createForList($model): array
    {
        return [
            'id' => (int)$model->id,
            'email' => $model->email ?? '',
            'username' => $model->username ?? '',
            'language' => $model->language ?? 'en',
            'avatar' => $model->avatar ?? null
        ];
    }

    /**
     * Get OpenAPI schema for user list item
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/users endpoint (list of users).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for list view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            // Remove sanitization and validation-only properties
            unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required']);
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
            'required' => ['id', 'email', 'username'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed user record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/users/{id}, POST, PUT, PATCH endpoints.
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
            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            // Remove sanitization and validation-only properties
            unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required']);
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
            'required' => ['id', 'email', 'username'],
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'UserAvailability' => [
                'type' => 'object',
                'required' => ['available', 'email'],
                'properties' => [
                    'available' => [
                        'type' => 'boolean',
                        'description' => 'rest_schema_users_available',
                        'example' => true
                    ],
                    'email' => [
                        'type' => 'string',
                        'format' => 'email',
                        'description' => 'rest_schema_users_email',
                        'example' => 'test@example.com'
                    ]
                ]
            ]
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
            // User credentials (writable)
            'email' => [
                'type' => 'string',
                'description' => 'rest_schema_users_email',
                'format' => 'email',
                'maxLength' => 255,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'admin@example.com'
            ],
            'username' => [
                'type' => 'string',
                'description' => 'rest_schema_users_username',
                'minLength' => 3,
                'maxLength' => 50,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'admin'
            ],
            // User preferences (writable)
            'language' => [
                'type' => 'string',
                'description' => 'rest_schema_users_language',
                'enum' => ['en', 'ru', 'de', 'es', 'fr', 'pt', 'uk', 'it', 'cs', 'tr', 'ja', 'vi', 'zh_Hans', 'pl', 'sv', 'nl', 'ka', 'ar', 'az', 'fa', 'ro'],
                'default' => 'en',
                'sanitize' => 'string',
                'example' => 'en'
            ],
            'avatar' => [
                'type' => 'string',
                'description' => 'rest_schema_users_avatar',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '/assets/img/avatars/admin.png'
            ],
            // Response-only fields (readOnly)
            'id' => [
                'type' => 'integer',
                'description' => 'rest_schema_users_id',
                'readOnly' => true,
                'example' => 1
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes user management parameter definitions.
     * Users resource handles web interface user accounts.
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

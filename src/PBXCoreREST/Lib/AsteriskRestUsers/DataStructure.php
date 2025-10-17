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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Asterisk REST Interface (ARI) Users with OpenAPI schema support
 *
 * Provides consistent data format for ARI user records in REST API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create complete data array from AsteriskRestUsers model.
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel($model): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Remove fields not applicable to ARI users
        // WHY: ARI users don't have uniqid (numeric ID is sufficient) or extension (not phone numbers)
        unset($data['uniqid'], $data['extension']);

        // Add ARI user specific fields
        $data['username'] = $model->username ?? '';
        $data['password'] = $model->password ?? '';
        $data['applications'] = $model->getApplicationsArray();

        // Add password strength indicator
        $data['weakPassword'] = (string)($model->weakPassword ?? '0');

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields(), handleNullValues(), etc.
        // The schema defines which fields should be boolean, integer, or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data array for list view.
     *
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Remove fields not applicable to ARI users
        // WHY: ARI users don't have uniqid (numeric ID is sufficient) or extension (not phone numbers)
        unset($data['uniqid'], $data['extension']);

        // Add ARI user specific fields for list display
        $data['username'] = $model->username ?? '';

        // Add applications summary
        $applications = $model->getApplicationsArray();
        $data['applicationsSummary'] = empty($applications) ? 'all' : implode(', ', $applications);
        $data['applicationsCount'] = count($applications);

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Create data structure for dropdown/select options.
     *
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array<string, mixed>
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'represent' => $model->username . (!empty($model->description) ? ' - ' . $model->description : ''),
        ];
    }

    /**
     * Create default structure for new ARI user.
     *
     * @return array<string, mixed>
     */
    public static function createDefault(): array
    {
        return [
            'id' => '',
            'username' => '',
            'password' => '',
            'applications' => [],
            'description' => '',
            'weakPassword' => '0',
        ];
    }

    /**
     * Get OpenAPI schema for ARI user list item
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/asterisk-rest-users endpoint (list of ARI users).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit request parameters used in list view (NO duplication!)
        $listFields = ['username', 'description'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
                // Remove sanitization and validation-only properties
                unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'applicationsSummary', 'applicationsCount'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'username'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed ARI user record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/asterisk-rest-users/{id}, POST, PUT, PATCH endpoints.
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
            'required' => ['id', 'username', 'password'],
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
            'username' => [
                'type' => 'string',
                'description' => 'rest_param_aru_username',
                'minLength' => 1,
                'maxLength' => 50,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'api_user'
            ],
            'password' => [
                'type' => 'string',
                'description' => 'rest_param_aru_password',
                'minLength' => 8,
                'maxLength' => 255,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'SecurePass123'
            ],
            'applications' => [
                'type' => 'array',
                'description' => 'rest_param_aru_applications',
                'items' => [
                    'type' => 'string',
                    'maxLength' => 100
                ],
                'sanitize' => 'array',
                'default' => [],
                'example' => ['app1', 'app2']
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_param_aru_description',
                'maxLength' => 255,
                'sanitize' => 'text',
                'default' => '',
                'example' => 'API user for call control'
            ],
            'weakPassword' => [
                'type' => 'string',
                'description' => 'rest_param_aru_weak_password',
                'enum' => ['0', '1', '2'], // 2 - Weak password, 1 - OK, 0 - Unknown password status
                'sanitize' => 'enum',
                'default' => '0',
                'example' => '2' // Weak password
            ],

            // Read-only fields - only in responses, never accepted in requests
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_aru_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '5'
            ],
            'applicationsSummary' => [
                'type' => 'string',
                'description' => 'rest_schema_aru_applications_summary',
                'readOnly' => true,
                'example' => 'app1, app2'
            ],
            'applicationsCount' => [
                'type' => 'integer',
                'description' => 'rest_schema_aru_applications_count',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 2
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * Defines all field schemas, validation rules, defaults, and sanitization rules in one place.
     *
     * ✨ Uses getAllFieldDefinitions() to eliminate duplication.
     * ✨ Follows CallQueues/IvrMenu pattern - fields returned directly, not wrapped
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
            'response' => array_merge(
                $responseOnlyFields,
                [
                    'represent' => [
                        'type' => 'string',
                        'description' => 'rest_schema_aru_represent',
                        'example' => 'api_user - API user for call control'
                    ]
                ]
            ),

            // ========== RELATED SCHEMAS ==========
            // No nested schemas for AsteriskRestUsers
            'related' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
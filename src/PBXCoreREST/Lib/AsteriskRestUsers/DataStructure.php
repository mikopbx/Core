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

        // Add ARI user specific fields
        $data['username'] = $model->username ?? '';
        $data['password'] = $model->password ?? '';
        $data['applications'] = $model->getApplicationsArray();

        // Add password strength indicator
        $data['weakPassword'] = (int)($model->weakPassword ?? 0);

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
     * @return array
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
     * @return array
     */
    public static function createDefault(): array
    {
        return [
            'id' => '',
            'username' => '',
            'password' => '',
            'applications' => [],
            'description' => '',
            'weakPassword' => 0,
        ];
    }

    /**
     * Get OpenAPI schema for ARI user list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/asterisk-rest-users endpoint (list of ARI users).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'username'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '5'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_username',
                    'maxLength' => 50,
                    'example' => 'api_user'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_description',
                    'maxLength' => 255,
                    'example' => 'API user for call control'
                ],
                'applicationsSummary' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_applications_summary',
                    'example' => 'app1, app2'
                ],
                'applicationsCount' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_aru_applications_count',
                    'minimum' => 0,
                    'example' => 2
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed ARI user record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/asterisk-rest-users/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'username', 'password'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '5'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_username',
                    'maxLength' => 50,
                    'example' => 'api_user'
                ],
                'password' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_password',
                    'maxLength' => 255,
                    'example' => 'SecurePass123'
                ],
                'applications' => [
                    'type' => 'array',
                    'description' => 'rest_schema_aru_applications',
                    'items' => [
                        'type' => 'string',
                        'example' => 'app1'
                    ],
                    'example' => ['app1', 'app2']
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_aru_description',
                    'maxLength' => 255,
                    'example' => 'API user for call control'
                ],
                'weakPassword' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_aru_weak_password',
                    'enum' => [0, 1],
                    'example' => 0
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
            if (in_array($fieldName, ['weakPassword', 'applicationsSummary', 'applicationsCount'])) {
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
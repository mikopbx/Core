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

namespace MikoPBX\PBXCoreREST\Lib\UserPageTracker;

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for user page tracking responses
 *
 * Provides OpenAPI schemas for page view and page leave tracking responses.
 * This is a tracking-only resource without database models.
 *
 * @package MikoPBX\PBXCoreREST\Lib\UserPageTracker
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Format page view response data
     *
     * @param array<string, mixed> $data Raw page view data
     * @return array<string, mixed> Formatted page view structure
     */
    public static function formatPageViewResponse(array $data): array
    {
        $formatted = [
            'sessionId' => $data['sessionId'] ?? '',
            'pageName' => $data['pageName'] ?? '',
            'expire' => (int)($data['expire'] ?? 300),
            'timestamp' => (int)($data['timestamp'] ?? time())
        ];

        return self::formatBySchema($formatted, 'detail');
    }

    /**
     * Format page leave response data
     *
     * @param array<string, mixed> $data Raw page leave data
     * @return array<string, mixed> Formatted page leave structure
     */
    public static function formatPageLeaveResponse(array $data): array
    {
        $formatted = [
            'sessionId' => $data['sessionId'] ?? '',
            'pageName' => $data['pageName'] ?? '',
            'timestamp' => (int)($data['timestamp'] ?? time())
        ];

        return self::formatBySchema($formatted, 'list');
    }

    /**
     * Get OpenAPI schema for page tracking response (list view)
     *
     * This schema is used for pageLeave responses.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['sessionId', 'pageName', 'timestamp'],
            'properties' => [
                'sessionId' => [
                    'type' => 'string',
                    'description' => 'rest_schema_upt_session_id',
                    'example' => 'sess_abc123def456'
                ],
                'pageName' => [
                    'type' => 'string',
                    'description' => 'rest_schema_upt_page_name',
                    'maxLength' => 255,
                    'example' => 'extensions-index'
                ],
                'timestamp' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_upt_timestamp',
                    'example' => 1704984123
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed page tracking response
     *
     * This schema is used for pageView responses.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['sessionId', 'pageName', 'expire', 'timestamp'],
            'properties' => [
                'sessionId' => [
                    'type' => 'string',
                    'description' => 'rest_schema_upt_session_id',
                    'example' => 'sess_abc123def456'
                ],
                'pageName' => [
                    'type' => 'string',
                    'description' => 'rest_schema_upt_page_name',
                    'maxLength' => 255,
                    'example' => 'extensions-index'
                ],
                'expire' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_upt_expire',
                    'minimum' => 60,
                    'maximum' => 86400,
                    'default' => 300,
                    'example' => 300
                ],
                'timestamp' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_upt_timestamp',
                    'example' => 1704984123
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
     * For UserPageTracker this provides input validation rules.
     *
     * @return array<string, string> Sanitization rules
     */
    public static function getSanitizationRules(): array
    {
        return [
            'pageName' => 'string|max:255',
            'expire' => 'int|min:60|max:86400',
            'sessionId' => 'string'
        ];
    }

    /**
     * Format data by OpenAPI schema
     *
     * Helper method to apply schema formatting.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type ('list' or 'detail')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType): array
    {
        // Get the appropriate schema
        $schema = $schemaType === 'list'
            ? static::getListItemSchema()
            : static::getDetailSchema();

        if (!isset($schema['properties'])) {
            return $data;
        }

        // Apply type conversions based on schema
        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            if (!isset($data[$fieldName])) {
                continue;
            }

            $type = $fieldSchema['type'] ?? 'string';
            $value = $data[$fieldName];

            // Convert types according to schema
            $data[$fieldName] = match ($type) {
                'integer' => (int)$value,
                'number' => (float)$value,
                'boolean' => (bool)$value,
                'array' => is_array($value) ? $value : [],
                default => (string)$value
            };
        }

        return $data;
    }
}

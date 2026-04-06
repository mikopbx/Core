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

namespace MikoPBX\PBXCoreREST\Lib\Common;

/**
 * Common parameter definitions for REST API
 *
 * Single Source of Truth for standard REST API parameters used across multiple controllers.
 * Provides definitions for pagination, filtering, and resource identification parameters.
 *
 * Usage in child DataStructure classes:
 * ```php
 * public static function getParameterDefinitions(): array
 * {
 *     return [
 *         'request' => array_merge(
 *             CommonDataStructure::getPaginationParameters(),
 *             [
 *                 'name' => [...],  // Resource-specific parameters
 *                 'extension' => [...],
 *             ]
 *         ),
 *         'response' => array_merge(
 *             CommonDataStructure::getCommonResponseFields(),
 *             [
 *                 'represent' => [...],  // Resource-specific response fields
 *             ]
 *         )
 *     ];
 * }
 * ```
 *
 * Usage in Controllers with ApiParameterRef:
 * ```php
 * // Reference common parameters from CommonDataStructure
 * #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
 * #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
 * #[ApiParameterRef('search', dataStructure: CommonDataStructure::class)]
 * public function getList(): void {}
 *
 * // Or override specific properties if needed
 * #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'date', 'priority'])]
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class CommonDataStructure
{
    /**
     * Get pagination parameter definitions
     *
     * Standard parameters for list endpoints with pagination.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getPaginationParameters(): array
    {
        return [
            'limit' => [
                'type' => 'integer',
                'description' => 'rest_param_limit',
                'in' => 'query',
                'minimum' => 1,
                'maximum' => 100,
                'default' => 20,
                'example' => 20,
                'sanitize' => 'int'
            ],
            'offset' => [
                'type' => 'integer',
                'description' => 'rest_param_offset',
                'in' => 'query',
                'minimum' => 0,
                'default' => 0,
                'example' => 0,
                'sanitize' => 'int'
            ],
        ];
    }

    /**
     * Get search and ordering parameter definitions
     *
     * Standard parameters for list endpoints with search and sorting.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getSearchAndOrderParameters(): array
    {
        return [
            'search' => [
                'type' => 'string',
                'description' => 'rest_param_search',
                'in' => 'query',
                'maxLength' => 255,
                'example' => 'search term',
                'sanitize' => 'text'
            ],
            'order' => [
                'type' => 'string',
                'description' => 'rest_param_order',
                'in' => 'query',
                'default' => 'name',
                'example' => 'name',
                'sanitize' => 'string',
                // NOTE: enum должен быть переопределен в каждом контроллере
                // через ApiParameterRef('order', enum: ['name', 'extension', ...])
            ],
            'orderWay' => [
                'type' => 'string',
                'description' => 'rest_param_orderWay',
                'in' => 'query',
                'enum' => ['ASC', 'DESC'],
                'default' => 'ASC',
                'example' => 'ASC',
                'sanitize' => 'string'
            ],
        ];
    }

    /**
     * Get resource ID parameter definition
     *
     * Standard parameter for resource-level endpoints (GET/PUT/PATCH/DELETE /{id}).
     *
     * @param string|null $pattern Custom pattern for ID validation (default: generic alphanumeric)
     * @param string|null $example Custom example value
     * @return array<string, mixed> Parameter definition
     */
    public static function getIdParameter(?string $pattern = null, ?string $example = null): array
    {
        return [
            'type' => 'string',
            'description' => 'rest_param_id',
            'in' => 'path',
            'required' => true,
            'pattern' => $pattern ?? '^[A-Z0-9-]+$',
            'example' => $example ?? 'RESOURCE-12345678',
            'sanitize' => 'string'
        ];
    }

    /**
     * Get common response-only field definitions
     *
     * Standard fields that appear in API responses but not in requests.
     *
     * @return array<string, array<string, mixed>> Field definitions
     */
    public static function getCommonResponseFields(): array
    {
        return [
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_id',
                'readOnly' => true,
                'example' => 'RESOURCE-12345678'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_search_index',
                'readOnly' => true,
                'example' => 'searchable indexed text'
            ],
        ];
    }

    /**
     * Get common path parameters
     *
     * Standard parameters for resource-level endpoints (/{id}).
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getPathParameters(): array
    {
        return [
            'id' => self::getIdParameter()
        ];
    }

    /**
     * Get all common parameter definitions in Single Source of Truth format
     *
     * Returns complete structure compatible with DataStructure::getParameterDefinitions().
     *
     * @return array<string, array<string, array<string, mixed>>> Complete parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => array_merge(
                self::getPaginationParameters(),
                self::getSearchAndOrderParameters(),
                self::getPathParameters()
            ),
            'response' => self::getCommonResponseFields(),
            'related' => []
        ];
    }
}

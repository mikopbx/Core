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
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/custom-files endpoint (list of custom files).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'filepath', 'mode'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '15'
                ],
                'filepath' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_filepath',
                    'maxLength' => 500,
                    'example' => '/etc/asterisk/custom.conf'
                ],
                'mode' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_mode',
                    'enum' => ['override', 'append', 'script', 'none'],
                    'example' => 'append'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_description',
                    'maxLength' => 500,
                    'example' => 'Custom Asterisk configuration'
                ],
                'changed' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_changed',
                    'enum' => ['0', '1'],
                    'example' => '0'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed custom file record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/custom-files/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'filepath', 'mode', 'content'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '15'
                ],
                'filepath' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_filepath',
                    'maxLength' => 500,
                    'example' => '/etc/asterisk/custom.conf'
                ],
                'content' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_content',
                    'example' => 'W2dlbmVyYWxdCmRlYnVnPXllcw=='
                ],
                'mode' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_mode',
                    'enum' => ['override', 'append', 'script', 'none'],
                    'default' => 'none',
                    'example' => 'append'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_description',
                    'maxLength' => 500,
                    'example' => 'Custom Asterisk configuration'
                ],
                'changed' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cf_changed',
                    'enum' => ['0', '1'],
                    'default' => '0',
                    'example' => '0'
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
     * Generate sanitization rules automatically from controller attributes
     *
     * Uses ParameterSanitizationExtractor to extract rules from #[ApiParameter] attributes.
     * This ensures Single Source of Truth - rules defined only in controller attributes.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        return \MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor::extractFromController(
            \MikoPBX\PBXCoreREST\Controllers\CustomFiles\RestController::class,
            'create'
        );
    }
}
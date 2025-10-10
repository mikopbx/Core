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
        return [
            'type' => 'object',
            'required' => ['id', 'number', 'type'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_id',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '201'
                ],
                'number' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_number',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '201'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_type',
                    'enum' => ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
                    'example' => 'SIP'
                ],
                'callerid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_callerid',
                    'maxLength' => 100,
                    'example' => 'John Doe'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed extension record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/extensions/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['number', 'type'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_id',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '201'
                ],
                'number' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_number',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '201'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_type',
                    'enum' => ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL'],
                    'default' => 'SIP',
                    'example' => 'SIP'
                ],
                'callerid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_callerid',
                    'maxLength' => 100,
                    'example' => 'John Doe'
                ],
                'userid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ext_userid',
                    'pattern' => '^[0-9]*$',
                    'example' => '12'
                ],
                'show_in_phonebook' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ext_show_in_phonebook',
                    'default' => true,
                    'example' => true
                ],
                'public_access' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ext_public_access',
                    'default' => false,
                    'example' => false
                ],
                'is_general_user_number' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ext_is_general_user_number',
                    'default' => true,
                    'example' => true
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
            \MikoPBX\PBXCoreREST\Controllers\Extensions\RestController::class,
            'create'
        );
    }
}

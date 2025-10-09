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
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/conference-rooms endpoint (list of conference rooms).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_id',
                    'pattern' => '^CONFERENCE-[A-Z0-9]{8,}$',
                    'example' => 'CONFERENCE-ABCD1234'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '3000'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_name',
                    'maxLength' => 100,
                    'example' => 'Sales Conference'
                ],
                'pinCode' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_pincode',
                    'maxLength' => 20,
                    'example' => '1234'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_represent',
                    'example' => '<i class="users icon"></i> Sales Conference <3000>'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed conference room record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/conference-rooms/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_id',
                    'pattern' => '^CONFERENCE-[A-Z0-9]{8,}$',
                    'example' => 'CONFERENCE-ABCD1234'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '3000'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_name',
                    'maxLength' => 100,
                    'example' => 'Sales Conference'
                ],
                'pinCode' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_pincode',
                    'maxLength' => 20,
                    'example' => '1234'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cr_represent',
                    'example' => '<i class="users icon"></i> Sales Conference <3000>'
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
            \MikoPBX\PBXCoreREST\Controllers\ConferenceRooms\RestController::class,
            'create'
        );
    }
}
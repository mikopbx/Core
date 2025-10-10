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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Dialplan Applications with OpenAPI schema support
 *
 * Creates consistent data format for API responses with automatic validation
 * and type conversion based on OpenAPI schema definitions.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;
    /**
     * Create complete data array from DialplanApplications model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add all dialplan application fields from model (raw values)
        $data['extension'] = $model->extension ?? '';
        $data['hint'] = $model->hint ?? '';
        $data['applicationlogic'] = $model->getApplicationlogic(); // Decoded logic for editing
        $data['type'] = $model->type ?? 'php';

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual type conversions
        // The schema defines which fields should be string, integer, or other types
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }
    
    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add dialplan application specific fields for list display
        $data['extension'] = $model->extension ?? '';
        $data['type'] = $model->type ?? 'php';
        $data['hint'] = $model->hint ?? '';

        // Create represent field for display
        // Note: The represent field contains HTML markup and will be escaped by the frontend when needed
        $icon = match($data['type']) {
            'echo' => 'microphone',
            'playback' => 'play',
            default => 'code'
        };
        $data['represent'] = "<i class=\"{$icon} icon\"></i> " . ($model->name ?? '') . " <{$model->extension}>";

        // Generate search index automatically from all fields
        // This will use all _represent fields and extract extension numbers
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options
     *
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array<string, mixed>
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => $model->uniqid, // Use uniqid as id for REST API v3
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'represent' => method_exists($model, 'getRepresent') ? $model->getRepresent() : ($model->name ?? '')
        ];
    }

    /**
     * Get OpenAPI schema for dialplan application list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/dialplan-applications endpoint (list of applications).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'type', 'represent'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_id',
                    'pattern' => '^DIALPLAN-[A-Z0-9]{8,32}$',
                    'example' => 'DIALPLAN-ABCD1234'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_extension',
                    'pattern' => '^[0-9*#]{2,8}$',
                    'example' => '999'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_name',
                    'maxLength' => 100,
                    'example' => 'Echo Test'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_description',
                    'maxLength' => 500,
                    'example' => 'Test echo application'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_type',
                    'enum' => ['php', 'plaintext', 'python3', 'lua', 'ael', 'none'],
                    'example' => 'php'
                ],
                'hint' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_hint',
                    'maxLength' => 255,
                    'example' => 'BLF hint for line status'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_represent',
                    'example' => '<i class="code icon"></i> Echo Test <999>'
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_search_index',
                    'example' => 'echo test 999 test echo application'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed dialplan application record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/dialplan-applications/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'type'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_id',
                    'pattern' => '^DIALPLAN-[A-Z0-9]{8,32}$',
                    'example' => 'DIALPLAN-ABCD1234'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_extension',
                    'pattern' => '^[0-9*#]{2,8}$',
                    'example' => '999'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_name',
                    'maxLength' => 100,
                    'example' => 'Echo Test'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_description',
                    'maxLength' => 500,
                    'example' => 'Test echo application'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_type',
                    'enum' => ['php', 'plaintext', 'python3', 'lua', 'ael', 'none'],
                    'default' => 'php',
                    'example' => 'php'
                ],
                'hint' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_hint',
                    'maxLength' => 255,
                    'example' => 'BLF hint for line status'
                ],
                'applicationlogic' => [
                    'type' => 'string',
                    'description' => 'rest_schema_da_applicationlogic',
                    'example' => '<?php\n// PHP code here'
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in dialplan application responses.
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
            \MikoPBX\PBXCoreREST\Controllers\DialplanApplications\RestController::class,
            'create'
        );
    }
}
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

namespace MikoPBX\PBXCoreREST\Lib\Storage;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for storage settings (singleton resource)
 *
 * Provides OpenAPI schemas for storage and disk management configuration.
 * This is a singleton resource - there's only one storage configuration.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for storage settings list (singleton)
     *
     * For singleton resources, list and detail schemas are identical.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get OpenAPI schema for detailed storage settings record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        return [
            'type' => 'object',
            'properties' => $responseFields
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
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
            'disk' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_disk',
                'maxLength' => 255,
                'sanitize' => 'text',
                'example' => '/dev/sdb1'
            ],
            PbxSettings::PBX_RECORD_SAVE_PERIOD => [
                'type' => 'integer',
                'description' => 'rest_schema_stg_save_period',
                'minimum' => 1,
                'maximum' => 3650,
                'sanitize' => 'int',
                'example' => 180
            ],
            'device' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_device',
                'maxLength' => 255,
                'sanitize' => 'text',
                'example' => '/dev/sdb1'
            ],
            'mountPoint' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_mount_point',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => '/storage/usbdisk1'
            ],
            'fileSystem' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_filesystem',
                'enum' => ['ext4', 'ext3'],
                'sanitize' => 'string',
                'default' => 'ext4',
                'example' => 'ext4'
            ],
            'label' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_label',
                'maxLength' => 16,
                'sanitize' => 'text',
                'example' => 'MikoPBX-Storage'
            ],
            'taskId' => [
                'type' => 'string',
                'description' => 'rest_schema_stg_task_id',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'mkfs-task-123'
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes storage settings parameter definitions.
     * Storage is a singleton resource for system storage configuration.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and response-only fields
        $writableFields = [];
        $responseFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                // Response-only fields keep rest_schema_* description
                $responseFields[$fieldName] = $fieldDef;
            } else {
                // Writable fields: add to both request (with rest_param_*) and response
                $requestField = $fieldDef;
                $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
                $writableFields[$fieldName] = $requestField;

                // All fields appear in response with schema description
                $responseFields[$fieldName] = $fieldDef;
            }
        }

        return [
            'request' => $writableFields,
            'response' => $responseFields,
            'related' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

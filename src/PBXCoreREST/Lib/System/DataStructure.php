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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for system management operations (singleton resource)
 *
 * Provides OpenAPI schemas for system-wide operations.
 * This is a singleton resource for system management.
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for system operations list (singleton)
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
     * Get OpenAPI schema for detailed system record
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
            'filename' => [
                'type' => 'string',
                'description' => 'rest_schema_system_audio_filename',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => '/tmp/audio.mp3'
            ],
            'language' => [
                'type' => 'string',
                'description' => 'rest_schema_system_language',
                'enum' => ['en', 'ru', 'de', 'es', 'fr', 'pt', 'uk'],
                'sanitize' => 'string',
                'example' => 'ru'
            ],
            'datetime' => [
                'type' => 'string',
                'description' => 'rest_schema_system_datetime',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-10-16 15:30:00'
            ],
            'status' => [
                'type' => 'string',
                'description' => 'rest_schema_system_status',
                'readOnly' => true,
                'example' => 'ok'
            ],
            'currentVersion' => [
                'type' => 'string',
                'description' => 'rest_schema_system_current_version',
                'readOnly' => true,
                'example' => '2024.2.100'
            ],
            'hasUpdates' => [
                'type' => 'boolean',
                'description' => 'rest_schema_system_has_updates',
                'readOnly' => true,
                'example' => true
            ],
            'lastCheck' => [
                'type' => 'string',
                'description' => 'rest_schema_system_last_check',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-10-21 14:30:00'
            ],
            'firmware' => [
                'type' => 'array',
                'description' => 'rest_schema_system_firmware_list',
                'items' => ['$ref' => '#/components/schemas/FirmwareRelease'],
                'readOnly' => true
            ],
            'command' => [
                'type' => 'string',
                'description' => 'rest_schema_system_command',
                'maxLength' => 10000,
                'sanitize' => 'text',
                'example' => 'ls -la /tmp'
            ],
            'timeout' => [
                'type' => 'integer',
                'description' => 'rest_schema_system_timeout',
                'minimum' => 1,
                'maximum' => 300,
                'sanitize' => 'int',
                'default' => 30,
                'example' => 30
            ],
            'query' => [
                'type' => 'string',
                'description' => 'rest_schema_system_query',
                'maxLength' => 10000,
                'sanitize' => 'text',
                'example' => 'SELECT * FROM Extensions LIMIT 10'
            ],
            'database' => [
                'type' => 'string',
                'description' => 'rest_schema_system_database',
                'enum' => ['main', 'cdr'],
                'sanitize' => 'string',
                'default' => 'main',
                'example' => 'main'
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes system management parameter definitions.
     * System is a singleton resource for system-wide operations.
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
            'related' => [
                'FirmwareRelease' => [
                    'type' => 'object',
                    'description' => 'rest_schema_firmware_release',
                    'properties' => [
                        'version' => [
                            'type' => 'string',
                            'description' => 'rest_schema_firmware_version',
                            'example' => '2024.2.150'
                        ],
                        'description' => [
                            'type' => 'string',
                            'description' => 'rest_schema_firmware_description',
                            'example' => 'New features and bug fixes'
                        ],
                        'href' => [
                            'type' => 'string',
                            'description' => 'rest_schema_firmware_download_url',
                            'format' => 'uri',
                            'example' => 'https://releases.mikopbx.com/releases/v1/mikopbx/2024.2.150/mikopbx-2024.2.150.img'
                        ],
                        'md5' => [
                            'type' => 'string',
                            'description' => 'rest_schema_firmware_md5',
                            'example' => 'a1b2c3d4e5f6g7h8i9j0'
                        ],
                        'size' => [
                            'type' => 'string',
                            'description' => 'rest_schema_firmware_size',
                            'example' => '450MB'
                        ],
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

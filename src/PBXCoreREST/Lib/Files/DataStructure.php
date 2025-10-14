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

namespace MikoPBX\PBXCoreREST\Lib\Files;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for file operations responses
 *
 * Provides OpenAPI schemas for file management operations including
 * file uploads, downloads, status checks, and firmware management.
 * This is a filesystem-based resource without database models.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Format upload status response data
     *
     * @param array<string, mixed> $data Raw upload status data
     * @return array<string, mixed> Formatted upload status structure
     */
    public static function formatUploadStatusResponse(array $data): array
    {
        $formatted = [
            'd_status' => $data['d_status'] ?? FilesConstants::STATUS_NOT_FOUND,
            'd_status_progress' => (string)($data['d_status_progress'] ?? '0'),
            'channelId' => $data['channelId'] ?? '',
            'eventBusEnabled' => (bool)($data['eventBusEnabled'] ?? false)
        ];

        return self::formatBySchema($formatted, 'detail');
    }

    /**
     * Format firmware download status response data
     *
     * @param array<string, mixed> $data Raw firmware status data
     * @return array<string, mixed> Formatted firmware status structure
     */
    public static function formatFirmwareStatusResponse(array $data): array
    {
        $formatted = [
            'd_status' => $data['d_status'] ?? FilesConstants::STATUS_NOT_FOUND,
            'd_status_progress' => (string)($data['d_status_progress'] ?? '0'),
            'filename' => $data['filename'] ?? '',
            'size' => (int)($data['size'] ?? 0),
            'channelId' => $data['channelId'] ?? '',
            'eventBusEnabled' => (bool)($data['eventBusEnabled'] ?? false)
        ];

        return self::formatBySchema($formatted, 'list');
    }

    /**
     * Get OpenAPI schema for file operation responses (list view)
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * Used for firmware download status and general file operations.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response-only fields (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'required' => ['d_status', 'd_status_progress'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed file operation response
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * Used for upload status checks.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit specific fields for detail view (NO duplication!)
        $detailFields = ['d_status', 'd_status_progress', 'channelId', 'eventBusEnabled'];
        foreach ($detailFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
                // Override example for detail view
                if ($field === 'd_status') {
                    $properties[$field]['example'] = FilesConstants::UPLOAD_IN_PROGRESS;
                } elseif ($field === 'd_status_progress') {
                    $properties[$field]['example'] = '75';
                } elseif ($field === 'eventBusEnabled') {
                    $properties[$field]['default'] = true;
                }
            }
        }

        return [
            'type' => 'object',
            'required' => ['d_status', 'd_status_progress', 'channelId'],
            'properties' => $properties
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes file operation parameter definitions.
     * Files is a filesystem-based resource without database models.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_param_file_path',
                    'maxLength' => 500,
                    'sanitize' => 'string',
                    'required' => true,
                    'example' => 'etc/asterisk/asterisk.conf'
                ],
                'filename' => [
                    'type' => 'string',
                    'description' => 'rest_param_file_filename',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'example' => 'firmware.img'
                ],
                'url' => [
                    'type' => 'string',
                    'description' => 'rest_param_file_url',
                    'maxLength' => 1000,
                    'sanitize' => 'string',
                    'example' => 'https://example.com/firmware.img'
                ],
                'resumeUpload' => [
                    'type' => 'string',
                    'description' => 'rest_param_file_resume_upload',
                    'maxLength' => 100,
                    'sanitize' => 'string',
                    'example' => 'file-upload-12345'
                ]
            ],
            'response' => [
                // File operation status fields
                'd_status' => [
                    'type' => 'string',
                    'description' => 'rest_schema_file_status',
                    'enum' => [
                        FilesConstants::STATUS_NOT_FOUND,
                        FilesConstants::UPLOAD_IN_PROGRESS,
                        FilesConstants::UPLOAD_COMPLETE,
                        FilesConstants::UPLOAD_FAILED
                    ],
                    'example' => FilesConstants::UPLOAD_COMPLETE
                ],
                'd_status_progress' => [
                    'type' => 'string',
                    'description' => 'rest_schema_file_progress',
                    'pattern' => '^[0-9]{1,3}$',
                    'example' => '100'
                ],
                'filename' => [
                    'type' => 'string',
                    'description' => 'rest_schema_file_filename',
                    'maxLength' => 255,
                    'example' => 'firmware.img'
                ],
                'size' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_file_size',
                    'minimum' => 0,
                    'example' => 1048576
                ],
                'channelId' => [
                    'type' => 'string',
                    'description' => 'rest_schema_file_channel_id',
                    'example' => 'file-upload-12345'
                ],
                'eventBusEnabled' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_file_event_bus',
                    'example' => true
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

    /**
     * Format data by OpenAPI schema
     *
     * Helper method to apply schema formatting.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type ('list' or 'detail')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
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

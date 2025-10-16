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
            // Request parameters (writable fields)
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_file_path',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => 'etc/asterisk/asterisk.conf'
            ],
            'filename' => [
                'type' => 'string',
                'description' => 'rest_schema_file_filename',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'firmware.img'
            ],
            'url' => [
                'type' => 'string',
                'description' => 'rest_schema_file_url',
                'maxLength' => 1000,
                'sanitize' => 'string',
                'example' => 'https://example.com/firmware.img'
            ],
            'md5' => [
                'type' => 'string',
                'description' => 'rest_schema_file_firmware_md5',
                'maxLength' => 32,
                'sanitize' => 'string',
                'example' => 'abc123def456'
            ],
            'resumableIdentifier' => [
                'type' => 'string',
                'description' => 'rest_schema_file_resumable_id',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => '12345'
            ],
            'resumableChunkNumber' => [
                'type' => 'integer',
                'description' => 'rest_schema_file_chunk_number',
                'minimum' => 1,
                'sanitize' => 'int',
                'example' => 1
            ],
            'resumableTotalChunks' => [
                'type' => 'integer',
                'description' => 'rest_schema_file_total_chunks',
                'minimum' => 1,
                'sanitize' => 'int',
                'example' => 10
            ],
            'resumableFilename' => [
                'type' => 'string',
                'description' => 'rest_schema_file_resumable_name',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'firmware.img'
            ],
            // Response-only fields (readOnly)
            'd_status' => [
                'type' => 'string',
                'description' => 'rest_schema_file_status',
                'enum' => [
                    FilesConstants::STATUS_NOT_FOUND,
                    FilesConstants::UPLOAD_IN_PROGRESS,
                    FilesConstants::UPLOAD_COMPLETE,
                    FilesConstants::UPLOAD_FAILED
                ],
                'readOnly' => true,
                'example' => FilesConstants::UPLOAD_COMPLETE
            ],
            'd_status_progress' => [
                'type' => 'string',
                'description' => 'rest_schema_file_progress',
                'pattern' => '^[0-9]{1,3}$',
                'readOnly' => true,
                'example' => '100'
            ],
            'size' => [
                'type' => 'integer',
                'description' => 'rest_schema_file_size',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 1048576
            ],
            'channelId' => [
                'type' => 'string',
                'description' => 'rest_schema_file_channel_id',
                'readOnly' => true,
                'example' => 'file-upload-12345'
            ],
            'eventBusEnabled' => [
                'type' => 'boolean',
                'description' => 'rest_schema_file_event_bus',
                'readOnly' => true,
                'example' => true
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes file operation parameter definitions.
     * Files is a filesystem-based resource without database models.
     *
     * Uses getAllFieldDefinitions() to eliminate duplication between request and response.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter writable fields (exclude readOnly) for request
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        // Add request-specific metadata
        $requestFields = [];
        foreach ($writableFields as $field => $definition) {
            $requestFields[$field] = $definition;
            // Transform description key: rest_schema_* → rest_param_*
            $requestFields[$field]['description'] = str_replace('rest_schema_', 'rest_param_', $requestFields[$field]['description']);
            // Add 'in' location for request parameters
            $requestFields[$field]['in'] = ($field === 'id') ? 'path' : 'query';
            // Mark id as required
            if ($field === 'id') {
                $requestFields[$field]['required'] = true;
            }
        }

        return [
            'request' => $requestFields,
            'response' => [
                // Note: response fields include both writable and readOnly fields
                // but we only expose specific fields in actual responses
                'd_status' => $allFields['d_status'],
                'd_status_progress' => $allFields['d_status_progress'],
                'filename' => $allFields['filename'],
                'size' => $allFields['size'],
                'channelId' => $allFields['channelId'],
                'eventBusEnabled' => $allFields['eventBusEnabled']
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

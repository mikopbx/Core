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

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for sound files with OpenAPI schema support
 *
 * Provides consistent data format for audio file records in REST API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create complete data array from SoundFiles model
     * @param mixed $model SoundFiles model instance
     * @return array<string, mixed>
     */
    public static function createFromModel($model): array
    {
        // SoundFiles doesn't have uniqid/extension fields, so we create structure manually
        $data = [
            'id' => (string)$model->id,
            'name' => $model->name ?? '',
            'description' => $model->description ?? ''
        ];
        
        // Add SoundFiles specific fields
        // Ensure path is a string, handle cases where it might be an object/array
        $pathValue = $model->path ?? '';
        if (is_object($pathValue) || is_array($pathValue)) {
            // If path contains an object/array, try to extract string value
            if (is_object($pathValue) && method_exists($pathValue, '__toString')) {
                $data['path'] = (string)$pathValue;
            } elseif (is_array($pathValue) && isset($pathValue['path'])) {
                $data['path'] = (string)$pathValue['path'];
            } else {
                // Fallback to empty string if we can't extract a proper path
                $data['path'] = '';
            }
        } else {
            $data['path'] = (string)$pathValue;
        }

        $data['category'] = $model->category ?? SoundFiles::CATEGORY_CUSTOM;

        // Use the corrected path value for file operations
        $actualPath = $data['path'];
        $data['fileSize'] = file_exists($actualPath) ? filesize($actualPath) : 0;
        $data['duration'] = self::getAudioDuration($actualPath);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     *
     * @param mixed $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // For list view, include all data (sound files don't have heavy relations)
        $data = self::createFromModel($model);

        // Apply OpenAPI list schema formatting to ensure proper types
        $data = self::formatBySchema($data, 'list');

        return $data;
    }
    
    /**
     * Get audio file duration using ffprobe (with fallback to soxi)
     * @param string $path Path to audio file
     * @return string Duration in MM:SS format
     */
    private static function getAudioDuration(string $path): string
    {
        if (!file_exists($path)) {
            return '00:00';
        }

        // Try ffprobe first (universal, works with all formats)
        $ffprobe = Util::which('ffprobe');
        if (!empty($ffprobe)) {
            $output = [];
            $cmd = "$ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '$path' 2>/dev/null";
            $result = Processes::mwExec($cmd, $output);

            if ($result === 0 && !empty($output[0])) {
                $seconds = round((float)trim($output[0]));
                $minutes = floor($seconds / 60);
                $seconds = $seconds % 60;
                return sprintf('%02d:%02d', $minutes, $seconds);
            }
        }

        // Fallback to sox if available (faster for WAV)
        $soxi = Util::which('soxi');
        if (!empty($soxi)) {
            $output = [];
            $result = Processes::mwExec("$soxi -D '$path' 2>/dev/null", $output);

            if ($result === 0 && !empty($output[0])) {
                $seconds = round((float)trim($output[0]));
                $minutes = floor($seconds / 60);
                $seconds = $seconds % 60;
                return sprintf('%02d:%02d', $minutes, $seconds);
            }
        }

        return '00:00';
    }

    /**
     * Get OpenAPI schema for sound file list item
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/sound-files endpoint (list of sound files).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for list view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            // Remove sanitization and validation-only properties
            unset($properties[$field]['sanitize'], $properties[$field]['minLength'], $properties[$field]['required']);
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'fileSize', 'duration'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'name'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed sound file record
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        // For sound files, detail and list schemas are identical
        return self::getListItemSchema();
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
            // Core fields (writable)
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_name',
                'minLength' => 1,
                'maxLength' => 200,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'Welcome Message'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'default' => '',
                'example' => 'Welcome message for IVR'
            ],
            'path' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_path',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '/tmp/upload/audio.wav'
            ],
            'category' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_category',
                'enum' => ['custom', 'moh', 'system'],
                'sanitize' => 'string',
                'default' => 'custom',
                'example' => 'custom'
            ],
            // Special operation fields (writable for specific endpoints)
            'view' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_view_path',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '/storage/usbdisk1/mikopbx/media/custom/file.mp3'
            ],
            'download' => [
                'type' => 'integer',
                'description' => 'rest_schema_sf_download_flag',
                'minimum' => 0,
                'maximum' => 1,
                'sanitize' => 'int',
                'example' => 1
            ],
            'filename' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_filename',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'audio.mp3'
            ],
            'filePath' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_file_path',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => '/tmp/audio.mp3'
            ],
            // Response-only fields (readOnly)
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '1'
            ],
            'fileSize' => [
                'type' => 'integer',
                'description' => 'rest_schema_sf_file_size',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 524288
            ],
            'duration' => [
                'type' => 'string',
                'description' => 'rest_schema_sf_duration',
                'pattern' => '^[0-9]{2}:[0-9]{2}$',
                'readOnly' => true,
                'example' => '01:45'
            ]
        ];
    }

    /**
     * Get parameter definitions for OpenAPI and validation
     *
     * Single Source of Truth for all field definitions.
     * Used for sanitization, validation, defaults, and OpenAPI schema generation.
     *
     * Uses getAllFieldDefinitions() to eliminate duplication between request and response.
     *
     * @return array<string, mixed> Parameter definitions
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
            // Add 'in' location for request parameters (id is special case from REST controller)
            $requestFields[$field]['in'] = 'query';
        }

        // Add id as a special request parameter for path
        $requestFields['id'] = [
            'type' => 'string',
            'description' => 'rest_param_id',
            'in' => 'path',
            'pattern' => '^[a-zA-Z0-9_-]+$',
            'sanitize' => 'string',
            'required' => true,
            'example' => 'custom_welcome'
        ];

        return [
            'request' => $requestFields,
            'response' => [
                // Response includes both writable and readOnly fields
                'id' => $allFields['id'],
                'name' => $allFields['name'],
                'description' => $allFields['description'],
                'path' => $allFields['path'],
                'category' => $allFields['category'],
                'fileSize' => $allFields['fileSize'],
                'duration' => $allFields['duration']
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
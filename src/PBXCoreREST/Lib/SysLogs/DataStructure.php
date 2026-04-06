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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for system logs operations
 *
 * Provides parameter definitions for log management endpoints.
 * This is a filesystem/system-based resource without database models.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for list (not used for this resource)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => []
        ];
    }

    /**
     * Get OpenAPI schema for detail (not used for this resource)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => []
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * SysLogs does not have nested objects, so no related schemas are needed.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * SysLogs is a system-based resource for log management (read-only operations).
     * All parameters are query parameters for filtering/pagination.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            'filename' => [
                'type' => 'string',
                'description' => 'rest_schema_syslog_filename',
                'in' => 'query',
                'required' => true,
                'minLength' => 1,
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => 'asterisk/messages'
            ],
            'filter' => [
                'type' => 'string',
                'description' => 'rest_schema_syslog_filter',
                'in' => 'query',
                'maxLength' => 2000,
                'sanitize' => 'string',
                'example' => 'ERROR'
            ],
            'logLevel' => [
                'type' => 'string',
                'description' => 'rest_schema_syslog_log_level',
                'in' => 'query',
                'maxLength' => 50,
                'sanitize' => 'string',
                'example' => 'ERROR'
            ],
            'lines' => [
                'type' => 'integer',
                'description' => 'rest_schema_syslog_lines',
                'in' => 'query',
                'minimum' => 1,
                'maximum' => 10000,
                'default' => 500,
                'sanitize' => 'int',
                'example' => 500
            ],
            'offset' => [
                'type' => 'integer',
                'description' => 'rest_schema_syslog_offset',
                'in' => 'query',
                'minimum' => 0,
                'default' => 0,
                'sanitize' => 'int',
                'example' => 0
            ],
            'dateFrom' => [
                'type' => 'string',
                'description' => 'rest_schema_syslog_date_from',
                'in' => 'query',
                'maxLength' => 50,
                'sanitize' => 'string',
                'example' => '2025-10-09 08:00:00'
            ],
            'dateTo' => [
                'type' => 'string',
                'description' => 'rest_schema_syslog_date_to',
                'in' => 'query',
                'maxLength' => 50,
                'sanitize' => 'string',
                'example' => '2025-10-09 09:00:00'
            ],
            'archive' => [
                'type' => 'boolean',
                'description' => 'rest_schema_syslog_archive',
                'in' => 'query',
                'default' => false,
                'sanitize' => 'bool',
                'example' => false
            ],
            'latest' => [
                'type' => 'boolean',
                'description' => 'rest_schema_syslog_latest',
                'in' => 'query',
                'default' => false,
                'sanitize' => 'bool',
                'example' => true
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes syslog parameter definitions.
     * SysLogs is a system-based resource for log management.
     * All fields are query parameters (no database model).
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // All fields are writable query parameters (no read-only fields)
        $writableFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            // For request section, use rest_param_* descriptions
            $requestField = $fieldDef;
            $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
            $writableFields[$fieldName] = $requestField;
        }

        return [
            // ========== REQUEST PARAMETERS ==========
            // Query parameters for log retrieval
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // SysLogs has no persistent model, responses are dynamically generated
            'response' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

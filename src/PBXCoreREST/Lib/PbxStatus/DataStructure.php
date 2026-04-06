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

namespace MikoPBX\PBXCoreREST\Lib\PbxStatus;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for PBX Status (real-time monitoring)
 *
 * Provides structure for real-time PBX monitoring data including active calls and channels.
 * This is a read-only resource that returns current PBX state, not historical data.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\PbxStatus
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for active calls response
     *
     * This schema matches the structure returned by GetActiveCallsAction.
     * Used for GET /api/v3/pbx-status:getActiveCalls endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getActiveCallsSchema(): array
    {
        return [
            'type' => 'object',
            'description' => 'rest_schema_pbx_status_active_calls',
            'properties' => [
                'start' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_call_start',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:45'
                ],
                'answer' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_call_answer',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:50'
                ],
                'endtime' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_call_endtime',
                    'format' => 'date-time',
                    'example' => ''
                ],
                'src_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_src_num',
                    'example' => '201'
                ],
                'dst_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_dst_num',
                    'example' => '202'
                ],
                'did' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_did',
                    'example' => '74951234567'
                ],
                'linkedid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_linkedid',
                    'example' => '1705315845.1'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for active channels response
     *
     * This schema matches the structure returned by GetActiveChannelsAction.
     * Used for GET /api/v3/pbx-status:getActiveChannels endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getActiveChannelsSchema(): array
    {
        return [
            'type' => 'object',
            'description' => 'rest_schema_pbx_status_active_channels',
            'properties' => [
                'start' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_channel_start',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:45'
                ],
                'answer' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_channel_answer',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:50'
                ],
                'src_chan' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_src_chan',
                    'example' => 'SIP/201-00000001'
                ],
                'dst_chan' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_dst_chan',
                    'example' => 'SIP/202-00000002'
                ],
                'src_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_src_num',
                    'example' => '201'
                ],
                'dst_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_dst_num',
                    'example' => '202'
                ],
                'did' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_did',
                    'example' => '74951234567'
                ],
                'linkedid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pbx_status_linkedid',
                    'example' => '1705315845.1'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for list item (not used for PbxStatus)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        // PbxStatus doesn't have a standard list endpoint
        // Each custom method returns its own structure
        return [];
    }

    /**
     * Get OpenAPI schema for detailed record (not used for PbxStatus)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        // PbxStatus doesn't have a standard detail endpoint
        // Each custom method returns its own structure
        return [];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for both active calls and active channels
     * that can be referenced in OpenAPI specification.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'ActiveCall' => self::getActiveCallsSchema(),
            'ActiveChannel' => self::getActiveChannelsSchema()
        ];
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * PbxStatus is a read-only monitoring resource with no input parameters.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: PbxStatus is a read-only monitoring resource.
     * No input parameters are needed - all methods return current state.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            // ========== REQUEST PARAMETERS ==========
            // No request parameters - PbxStatus is read-only monitoring
            'request' => [],

            // ========== RESPONSE-ONLY FIELDS ==========
            // Response structures are defined in getActiveCallsSchema() and getActiveChannelsSchema()
            'response' => [],

            // ========== RELATED SCHEMAS ==========
            'related' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

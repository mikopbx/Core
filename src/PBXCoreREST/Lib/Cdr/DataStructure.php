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

namespace MikoPBX\PBXCoreREST\Lib\Cdr;

use MikoPBX\Common\Models\RecordingStorage;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for CDR (Call Detail Records)
 *
 * Creates consistent data format for API responses.
 * CDR records are read-only, so no write operations are supported.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from CallDetailRecords model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\CallDetailRecords $model CDR model instance
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        // CDR uses numeric id as the identifier
        $data = [
            'id' => $model->id,
            'start' => $model->start ?? '',
            'endtime' => $model->endtime ?? '',
            'answer' => $model->answer ?? '',
            'src_chan' => $model->src_chan ?? '',
            'src_num' => $model->src_num ?? '',
            'src_name' => $model->src_name ?? '',
            'dst_chan' => $model->dst_chan ?? '',
            'dst_num' => $model->dst_num ?? '',
            'dst_name' => $model->dst_name ?? '',
            'UNIQUEID' => $model->UNIQUEID ?? '',
            'linkedid' => $model->linkedid ?? '',
            'did' => $model->did ?? '',
            'disposition' => $model->disposition ?? '',
            'recordingfile' => $model->recordingfile ?? '',
            'from_account' => $model->from_account ?? '',
            'to_account' => $model->to_account ?? '',
            'dialstatus' => $model->dialstatus ?? '',
            'appname' => $model->appname ?? '',
            'transfer' => $model->transfer ?? '0',
            'is_app' => $model->is_app ?? '0',
            'duration' => $model->duration ?? 0,
            'billsec' => $model->billsec ?? 0,
            'work_completed' => $model->work_completed ?? '0',
            'src_call_id' => $model->src_call_id ?? '',
            'dst_call_id' => $model->dst_call_id ?? '',
            'verbose_call_id' => $model->verbose_call_id ?? '',
            'rec_src_channel' => $model->rec_src_channel ?? '',
            'dtmf_digits' => $model->dtmf_digits ?? '',
        ];

        // Add recording URLs if file exists (local or S3)
        // WHY: Provides secure token-based access without exposing file paths
        // Two URLs: playback (for inline streaming) and download (for file download)
        // IMPORTANT: Check RecordingStorage first for S3 files, then file_exists for backward compatibility
        $fileAvailable = false;

        if (!empty($model->recordingfile)) {
            // STEP 1: Check RecordingStorage mapping table
            // WHY: Files migrated to S3 won't pass file_exists() but are still accessible
            $storageRecord = RecordingStorage::findByPath($model->recordingfile);

            if ($storageRecord !== null) {
                // File is tracked - available either locally or in S3
                $fileAvailable = true;
            } elseif (file_exists($model->recordingfile)) {
                // STEP 2: Backward compatibility - check local file for older records
                // WHY: Records created before S3 migration won't have RecordingStorage entry
                $fileAvailable = true;
            }
        }

        if ($fileAvailable) {
            $token = self::generatePlaybackToken($model->id);

            if (!empty($token)) {
                // Relative URLs - CRM knows the host and port
                // WHY: Token already contains CDR ID in Redis, no need to expose ID in URL
                $data['playback_url'] = "/pbxcore/api/v3/cdr:playback?token={$token}";
                $data['download_url'] = "/pbxcore/api/v3/cdr:download?token={$token}";
            } else {
                // Token generation failed (Redis unavailable?)
                // Keep recordingfile but clear URLs
                $data['playback_url'] = '';
                $data['download_url'] = '';
            }
        } else {
            // File doesn't exist anywhere (local, S3, or not tracked)
            // WHY: Consistency - if no file, all 3 fields should be empty
            $data['recordingfile'] = '';
            $data['playback_url'] = '';
            $data['download_url'] = '';
        }

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual type conversion
        // The schema defines which fields should be integer or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\CallDetailRecords $model CDR model instance
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // For CDR, list and detail structures are the same
        // CDR is read-only, no simplification needed
        $data = self::createFromModel($model);

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for CDR list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/cdr endpoint (list of CDR records).
     * For CDR, list and detail schemas are identical since CDR is read-only.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get OpenAPI schema for detailed CDR record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/cdr/{id} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response-only fields (NO duplication!)
        // CDR is read-only, so all fields come from response section
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'required' => ['id', 'start', 'src_num', 'dst_num', 'disposition'],
            'description' => 'rest_schema_cdr_detail',
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * CDR does not have nested objects, so no related schemas are needed.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }

    /**
     * Get query/filter parameter definitions (writable fields)
     *
     * Single Source of Truth for query parameters and filters.
     * These parameters are used in API requests but are NOT part of CDR record structure.
     *
     * WHY: Separate from CDR record fields to avoid confusion and naming conflicts.
     * Filter fields like 'src_num' are different from CDR record fields 'src_num'.
     *
     * @return array<string, array<string, mixed>> Query parameter definitions
     */
    private static function getQueryParameterDefinitions(): array
    {
        return [
            // ========== PATH PARAMETERS ==========
            'id' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_id',
                'in' => 'path',
                'required' => true,
                'pattern' => '^([0-9]+|mikopbx-.+)$',
                'example' => '12345',
                'sanitize' => 'string'
            ],

            // ========== PAGINATION ==========
            'limit' => [
                'type' => 'integer',
                'description' => 'rest_param_cdr_limit',
                'minimum' => 1,
                'maximum' => 1000,
                'default' => 50,
                'sanitize' => 'int',
                'in' => 'query',
                'example' => 50
            ],
            'offset' => [
                'type' => 'integer',
                'description' => 'rest_param_cdr_offset',
                'minimum' => 0,
                'default' => 0,
                'sanitize' => 'int',
                'in' => 'query',
                'example' => 0
            ],

            // ========== DATE FILTERS ==========
            'dateFrom' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_dateFrom',
                'format' => 'date-time',
                'sanitize' => 'string',
                'in' => 'query',
                'example' => '2025-01-01T00:00:00'
            ],
            'dateTo' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_dateTo',
                'format' => 'date-time',
                'sanitize' => 'string',
                'in' => 'query',
                'example' => '2025-01-31T23:59:59'
            ],

            // ========== SEARCH FILTERS ==========
            'search' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_search',
                'sanitize' => 'string',
                'maxLength' => 255,
                'in' => 'query',
                'example' => '79643442732'
            ],
            'src_num' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_src_num',
                'sanitize' => 'string',
                'maxLength' => 64,
                'in' => 'query',
                'example' => '201'
            ],
            'dst_num' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_dst_num',
                'sanitize' => 'string',
                'maxLength' => 64,
                'in' => 'query',
                'example' => '202'
            ],
            'did' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_did',
                'sanitize' => 'string',
                'maxLength' => 64,
                'in' => 'query',
                'example' => '74951234567'
            ],
            'disposition' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_disposition',
                'enum' => ['ANSWERED', 'NO ANSWER', 'NOANSWER', 'BUSY', 'FAILED'],
                'sanitize' => 'string',
                'in' => 'query',
                'example' => 'ANSWERED'
            ],
            'linkedid' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_linkedid',
                'sanitize' => 'string',
                'in' => 'query',
                'example' => '1705315845.1'
            ],

            // ========== PLAYBACK PARAMETERS ==========
            'token' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_token',
                'minLength' => 32,
                'maxLength' => 64,
                'sanitize' => 'string',
                'in' => 'query',
                'example' => 'abc123def456789012345678901234567890abcd'
            ],
            'view' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_view',
                'maxLength' => 500,
                'sanitize' => 'string',
                'in' => 'query',
                'example' => '/storage/usbdisk1/mikopbx/voicemailbackup/monitor/2025/01/15/call-123.mp3'
            ],
            'download' => [
                'type' => 'boolean',
                'description' => 'rest_param_cdr_download',
                'default' => false,
                'sanitize' => 'bool',
                'in' => 'query',
                'example' => false
            ],
            'filename' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_filename',
                'maxLength' => 255,
                'sanitize' => 'string',
                'in' => 'query',
                'example' => 'call-recording.mp3'
            ],
            'format' => [
                'type' => 'string',
                'description' => 'rest_param_cdr_format',
                'enum' => ['mp3', 'wav', 'webm', 'ogg'],
                'default' => 'original',
                'sanitize' => 'string',
                'in' => 'query',
                'example' => 'mp3',
                'nullable' => true
            ],

            // ========== DELETE PARAMETERS ==========
            'deleteRecording' => [
                'type' => 'boolean',
                'description' => 'rest_param_cdr_deleteRecording',
                'default' => false,
                'sanitize' => 'bool',
                'in' => 'query',
                'example' => false
            ],
        ];
    }

    /**
     * Get CDR record field definitions (read-only response fields)
     *
     * Single Source of Truth for CDR record structure.
     * These fields represent actual CDR database columns.
     * ALL fields are read-only since CDR records are created by Asterisk, not via API.
     *
     * WHY: Separate from query parameters for clarity.
     * CDR record field 'src_num' is different from filter parameter 'src_num'.
     *
     * @return array<string, array<string, mixed>> CDR record field definitions
     */
    private static function getCdrRecordFieldDefinitions(): array
    {
        return [
            'id' => [
                'type' => 'integer',
                'description' => 'rest_schema_cdr_id',
                'readOnly' => true,
                'example' => 12345
            ],
            'start' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_start',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-01-15 10:30:45'
            ],
            'endtime' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_endtime',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-01-15 10:35:20'
            ],
            'answer' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_answer',
                'format' => 'date-time',
                'readOnly' => true,
                'example' => '2025-01-15 10:30:50'
            ],
            'src_chan' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_src_chan',
                'readOnly' => true,
                'example' => 'SIP/101-00000001'
            ],
            'src_num' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_src_num',
                'readOnly' => true,
                'example' => '101'
            ],
            'src_name' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_src_name',
                'readOnly' => true,
                'example' => 'John Smith'
            ],
            'dst_chan' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dst_chan',
                'readOnly' => true,
                'example' => 'SIP/102-00000002'
            ],
            'dst_num' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dst_num',
                'readOnly' => true,
                'example' => '102'
            ],
            'dst_name' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dst_name',
                'readOnly' => true,
                'example' => 'Support Queue'
            ],
            'UNIQUEID' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_uniqueid',
                'readOnly' => true,
                'example' => '1705315845.1'
            ],
            'linkedid' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_linkedid',
                'readOnly' => true,
                'example' => '1705315845.1'
            ],
            'did' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_did',
                'readOnly' => true,
                'example' => '74951234567'
            ],
            'disposition' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_disposition',
                'enum' => ['ANSWERED', 'NO ANSWER', 'NOANSWER', 'BUSY', 'FAILED'],
                'readOnly' => true,
                'example' => 'ANSWERED'
            ],
            'recordingfile' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_recordingfile',
                'readOnly' => true,
                'example' => '/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2025/01/15/101-102-20250115-103045-1705315845.1.mp3'
            ],
            'from_account' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_from_account',
                'readOnly' => true,
                'example' => ''
            ],
            'to_account' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_to_account',
                'readOnly' => true,
                'example' => ''
            ],
            'dialstatus' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dialstatus',
                'readOnly' => true,
                'example' => 'ANSWER'
            ],
            'appname' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_appname',
                'readOnly' => true,
                'example' => ''
            ],
            'transfer' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_transfer',
                'readOnly' => true,
                'example' => '0'
            ],
            'is_app' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_is_app',
                'readOnly' => true,
                'example' => '0'
            ],
            'duration' => [
                'type' => 'integer',
                'description' => 'rest_schema_cdr_duration',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 275
            ],
            'billsec' => [
                'type' => 'integer',
                'description' => 'rest_schema_cdr_billsec',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 270
            ],
            'work_completed' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_work_completed',
                'readOnly' => true,
                'example' => '1'
            ],
            'src_call_id' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_src_call_id',
                'readOnly' => true,
                'example' => ''
            ],
            'dst_call_id' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dst_call_id',
                'readOnly' => true,
                'example' => ''
            ],
            'verbose_call_id' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_verbose_call_id',
                'readOnly' => true,
                'example' => ''
            ],
            'rec_src_channel' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_rec_src_channel',
                'enum' => ['', '0', '1'],
                'readOnly' => true,
                'example' => '1'
            ],
            'dtmf_digits' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_dtmf_digits',
                'readOnly' => true,
                'example' => 't,t,3'
            ],
            'playback_url' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_playback_url',
                'format' => 'uri',
                'nullable' => true,
                'readOnly' => true,
                'example' => '/pbxcore/api/v3/cdr/12345:playback?token=abc123def456'
            ],
            'download_url' => [
                'type' => 'string',
                'description' => 'rest_schema_cdr_download_url',
                'format' => 'uri',
                'nullable' => true,
                'readOnly' => true,
                'example' => '/pbxcore/api/v3/cdr/12345:download?token=abc123def456'
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes CDR parameter definitions.
     * Separates query/filter parameters (writable) from CDR record fields (read-only).
     *
     * Structure:
     * - 'request' => Query parameters used for filtering and operations
     * - 'response' => CDR record fields returned in API responses (all read-only)
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            // ========== REQUEST PARAMETERS ==========
            // Query/filter parameters for API operations
            // Referenced by ApiParameterRef in Controller
            // All parameters have 'in' => 'query' and 'sanitize' rules
            'request' => self::getQueryParameterDefinitions(),

            // ========== RESPONSE-ONLY FIELDS ==========
            // CDR record fields (all read-only, created by Asterisk)
            // Used by getDetailSchema() and getListItemSchema()
            // All fields have 'readOnly' => true
            'response' => self::getCdrRecordFieldDefinitions(),
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

    /**
     * Generate temporary token for recording playback
     *
     * WHY: Security - prevents direct file access
     * Tokens expire after 1 hour
     *
     * @param int $cdrId CDR record ID
     * @return string Temporary token
     */
    private static function generatePlaybackToken(int $cdrId): string
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return '';
        }

        $redis = $di->get('redis');

        // Generate random token (32 characters)
        $token = bin2hex(random_bytes(16));

        // Store in Redis with 1 hour TTL
        $key = "cdr_playback_token:{$token}";
        $redis->setex($key, 3600, $cdrId);

        return $token;
    }
}

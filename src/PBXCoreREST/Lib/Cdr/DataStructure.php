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
            'dst_chan' => $model->dst_chan ?? '',
            'dst_num' => $model->dst_num ?? '',
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
        ];

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
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/cdr/{id} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'start', 'src_num', 'dst_num', 'disposition'],
            'description' => 'rest_schema_cdr_detail',
            'properties' => [
                'id' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cdr_id',
                    'example' => 12345
                ],
                'start' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_start',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:45'
                ],
                'endtime' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_endtime',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:35:20'
                ],
                'answer' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_answer',
                    'format' => 'date-time',
                    'example' => '2025-01-15 10:30:50'
                ],
                'src_chan' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_src_chan',
                    'example' => 'SIP/101-00000001'
                ],
                'src_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_src_num',
                    'example' => '101'
                ],
                'dst_chan' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_dst_chan',
                    'example' => 'SIP/102-00000002'
                ],
                'dst_num' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_dst_num',
                    'example' => '102'
                ],
                'UNIQUEID' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_uniqueid',
                    'example' => '1705315845.1'
                ],
                'linkedid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_linkedid',
                    'example' => '1705315845.1'
                ],
                'did' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_did',
                    'example' => '74951234567'
                ],
                'disposition' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_disposition',
                    'enum' => ['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED'],
                    'example' => 'ANSWERED'
                ],
                'recordingfile' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_recordingfile',
                    'example' => '/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2025/01/15/101-102-20250115-103045-1705315845.1.mp3'
                ],
                'from_account' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_from_account',
                    'example' => ''
                ],
                'to_account' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_to_account',
                    'example' => ''
                ],
                'dialstatus' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_dialstatus',
                    'example' => 'ANSWER'
                ],
                'appname' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_appname',
                    'example' => ''
                ],
                'transfer' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_transfer',
                    'example' => '0'
                ],
                'is_app' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_is_app',
                    'example' => '0'
                ],
                'duration' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cdr_duration',
                    'minimum' => 0,
                    'example' => 275
                ],
                'billsec' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cdr_billsec',
                    'minimum' => 0,
                    'example' => 270
                ],
                'work_completed' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_work_completed',
                    'example' => '1'
                ],
                'src_call_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_src_call_id',
                    'example' => ''
                ],
                'dst_call_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_dst_call_id',
                    'example' => ''
                ],
                'verbose_call_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cdr_verbose_call_id',
                    'example' => ''
                ],
            ]
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
     * Generate sanitization rules automatically from controller attributes
     *
     * Uses ParameterSanitizationExtractor to extract rules from #[ApiParameter] attributes.
     * This ensures Single Source of Truth - rules defined only in controller attributes.
     *
     * For read-only resources like CDR, we extract from the 'getList' method.
     * CDR sanitization rules are primarily for query filtering parameters.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        return \MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor::extractFromController(
            \MikoPBX\PBXCoreREST\Controllers\Cdr\RestController::class,
            'getList'
        );
    }
}

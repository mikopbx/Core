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

namespace MikoPBX\PBXCoreREST\Lib\Passkeys;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for WebAuthn passkeys
 *
 * Creates consistent data format for API responses for passkey management.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from Passkey model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\WebAuthnCredentials $model Passkey model instance
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Add all passkey fields from model (raw values)
        $data['id'] = (int)$model->id;
        $data['user_id'] = (int)$model->user_id;
        $data['name'] = $model->name ?? '';
        $data['credential_id'] = $model->credential_id;
        $data['public_key'] = $model->public_key;
        $data['counter'] = (int)$model->counter;
        $data['aaguid'] = $model->aaguid ?? '';
        $data['transports'] = $model->transports ? json_decode($model->transports, true) : [];
        $data['created_at'] = $model->created_at;
        $data['last_used_at'] = $model->last_used_at;
        $data['user_agent'] = $model->user_agent ?? '';

        return $data;
    }

    /**
     * Create simplified data array for list view
     *
     * @param \MikoPBX\Common\Models\WebAuthnCredentials $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Add passkey specific fields for list display
        $data['id'] = (int)$model->id;
        $data['user_id'] = (int)$model->user_id;
        $data['name'] = $model->name ?? '';
        $data['created_at'] = $model->created_at;
        $data['last_used_at'] = $model->last_used_at;

        // Apply OpenAPI list schema formatting to ensure proper types
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for list item (implements OpenApiSchemaProvider interface)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'id' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_pk_id',
                    'example' => 1
                ],
                'user_id' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_pk_user_id',
                    'example' => 1
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_pk_name',
                    'example' => 'My YubiKey 5'
                ],
                'created_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'description' => 'rest_schema_pk_created_at',
                    'example' => '2025-01-15 10:30:00'
                ],
                'last_used_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'nullable' => true,
                    'description' => 'rest_schema_pk_last_used_at',
                    'example' => '2025-01-16 14:25:30'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detail view
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $baseSchema = self::getListItemSchema();

        // Add additional fields for detail view
        $baseSchema['properties']['credential_id'] = [
            'type' => 'string',
            'description' => 'rest_schema_pk_credential_id',
            'example' => 'Base64EncodedCredentialId...'
        ];
        $baseSchema['properties']['counter'] = [
            'type' => 'integer',
            'description' => 'rest_schema_pk_counter',
            'example' => 15
        ];
        $baseSchema['properties']['aaguid'] = [
            'type' => 'string',
            'description' => 'rest_schema_pk_aaguid',
            'example' => '00000000-0000-0000-0000-000000000000'
        ];
        $baseSchema['properties']['transports'] = [
            'type' => 'array',
            'items' => ['type' => 'string'],
            'description' => 'rest_schema_pk_transports',
            'example' => ['usb', 'nfc']
        ];
        $baseSchema['properties']['user_agent'] = [
            'type' => 'string',
            'description' => 'rest_schema_pk_user_agent',
            'example' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
        ];

        return $baseSchema;
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * @return array<string, string> Sanitization rules
     */
    public static function getSanitizationRules(): array
    {
        return [
            'id' => 'int',
            'user_id' => 'int',
            'name' => 'string|max:255',
            'credential_id' => 'string',
            'public_key' => 'string',
            'counter' => 'int',
            'aaguid' => 'string|max:36',
            'transports' => 'array',
            'user_agent' => 'string|max:500'
        ];
    }
}

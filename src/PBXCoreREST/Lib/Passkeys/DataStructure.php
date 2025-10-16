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
     * @param \MikoPBX\Common\Models\UserPasskeys $model Passkey model instance
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
     * @param \MikoPBX\Common\Models\UserPasskeys $model
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
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit specific fields for list view (NO duplication!)
        $listFields = ['id', 'user_id', 'name', 'created_at', 'last_used_at'];
        foreach ($listFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detail view
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response fields for detail view (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
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
            // Passkey identification
            'id' => [
                'type' => 'integer',
                'description' => 'rest_schema_pk_id',
                'minimum' => 1,
                'readOnly' => true,
                'example' => 1
            ],
            'user_id' => [
                'type' => 'integer',
                'description' => 'rest_schema_pk_user_id',
                'minimum' => 1,
                'sanitize' => 'int',
                'example' => 1
            ],
            // Passkey metadata
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_name',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => 'My YubiKey 5'
            ],
            // WebAuthn credential data
            'credential' => [
                'type' => 'object',
                'description' => 'rest_schema_pk_credential',
                'sanitize' => 'array',
                'example' => ['id' => '...', 'rawId' => '...', 'response' => []]
            ],
            'credential_id' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_credential_id',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => 'Base64EncodedCredentialId...'
            ],
            'public_key' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_public_key',
                'maxLength' => 1000,
                'sanitize' => 'string',
                'readOnly' => true,
                'example' => 'Base64EncodedPublicKey...'
            ],
            'counter' => [
                'type' => 'integer',
                'description' => 'rest_schema_pk_counter',
                'minimum' => 0,
                'default' => 0,
                'sanitize' => 'int',
                'example' => 15
            ],
            'aaguid' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_aaguid',
                'maxLength' => 100,
                'sanitize' => 'string',
                'example' => '00000000-0000-0000-0000-000000000000'
            ],
            'transports' => [
                'type' => 'array',
                'items' => ['type' => 'string'],
                'description' => 'rest_schema_pk_transports',
                'sanitize' => 'array',
                'example' => ['usb', 'nfc']
            ],
            'created_at' => [
                'type' => 'string',
                'format' => 'date-time',
                'description' => 'rest_schema_pk_created_at',
                'readOnly' => true,
                'example' => '2025-01-15 10:30:00'
            ],
            'last_used_at' => [
                'type' => 'string',
                'format' => 'date-time',
                'nullable' => true,
                'description' => 'rest_schema_pk_last_used_at',
                'readOnly' => true,
                'example' => '2025-01-16 14:25:30'
            ],
            'user_agent' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_user_agent',
                'readOnly' => true,
                'example' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
            ],
            // Authentication parameters
            'login' => [
                'type' => 'string',
                'description' => 'rest_schema_pk_login',
                'maxLength' => 100,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'admin'
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes passkey parameter definitions.
     * Passkeys resource handles WebAuthn passkey registration and authentication.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter writable fields (exclude readOnly)
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        // Transform description keys: rest_schema_* → rest_param_*
        $requestFields = [];
        foreach ($writableFields as $field => $definition) {
            $requestField = $definition;
            $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $definition['description']);
            $requestFields[$field] = $requestField;
        }

        return [
            'request' => $requestFields,
            'response' => $allFields
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

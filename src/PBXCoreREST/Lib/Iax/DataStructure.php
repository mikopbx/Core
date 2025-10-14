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

namespace MikoPBX\PBXCoreREST\Lib\Iax;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for IAX registry status
 *
 * Creates consistent data format for IAX provider registration status responses.
 * IAX is a singleton resource focused on monitoring and status reporting.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Iax
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for IAX registry status item
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by GetRegistryAction.
     * Used for GET /api/v3/iax:getRegistry endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getRegistrySchema(): array
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
            'required' => ['id', 'state', 'username', 'host', 'noregister'],
            'description' => 'rest_schema_iax_registry_item',
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for IAX list item
     *
     * For IAX, we don't have a traditional list, so this returns the registry schema.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getRegistrySchema();
    }

    /**
     * Get OpenAPI schema for detailed IAX record
     *
     * For IAX singleton resource, detail and registry schemas are the same.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return self::getRegistrySchema();
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes IAX parameter definitions.
     * IAX is a read-only monitoring resource - no request parameters needed.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // No request parameters - IAX is read-only monitoring
            ],
            'response' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_id',
                    'pattern' => '^IAX-[A-Z0-9]{8,32}$',
                    'example' => 'IAX-1234ABCD'
                ],
                'state' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_state',
                    'enum' => ['OFF', 'Registered', 'Unregistered', 'Error register.', 'LAGGED', 'OK'],
                    'example' => 'Registered'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_username',
                    'maxLength' => 100,
                    'example' => 'myiaxuser'
                ],
                'host' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_host',
                    'maxLength' => 255,
                    'example' => 'iax.provider.com'
                ],
                'noregister' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_noregister',
                    'enum' => ['0', '1'],
                    'example' => '0'
                ],
                'time-response' => [
                    'type' => 'string',
                    'description' => 'rest_schema_iax_time_response',
                    'example' => '15MS'
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

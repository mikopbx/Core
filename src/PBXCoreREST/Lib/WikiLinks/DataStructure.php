<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\WikiLinks;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for wiki links responses
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create response data structure from URL
     *
     * @param string $url Documentation URL
     * @return array Response data
     */
    public static function create(string $url): array
    {
        return self::formatBySchema(['url' => $url], 'detail');
    }

    /**
     * Get OpenAPI schema for wiki link response
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     *
     * @return array OpenAPI schema
     */
    public static function getDetailSchema(): array
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
            'required' => ['url'],
            'properties' => $properties
        ];
    }

    /**
     * Format data according to schema
     *
     * @param array $data Data to format
     * @param string $schemaType Schema type ('detail' or 'list')
     * @return array Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
    {
        $schema = match ($schemaType) {
            'detail' => self::getDetailSchema(),
            default => []
        };

        // Basic validation and type conversion
        $result = [];
        foreach ($schema['properties'] ?? [] as $key => $property) {
            if (isset($data[$key])) {
                $result[$key] = $data[$key];
            }
        }

        return $result;
    }

    /**
     * Get OpenAPI schema for list items (not used for this endpoint)
     *
     * @return array
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes wiki links parameter definitions.
     * WikiLinks is a utility resource that generates documentation URLs.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // Page identifier for documentation lookup
                'page' => [
                    'type' => 'string',
                    'description' => 'rest_param_wl_page',
                    'maxLength' => 255,
                    'sanitize' => 'string',
                    'required' => true,
                    'example' => 'extensions-index'
                ]
            ],
            'response' => [
                'url' => [
                    'type' => 'string',
                    'description' => 'rest_schema_wl_url',
                    'format' => 'uri',
                    'example' => 'https://docs.mikopbx.com/mikopbx/v/english/manual/telephony/extensions'
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

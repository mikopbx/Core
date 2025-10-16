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

namespace MikoPBX\PBXCoreREST\Lib\OpenAPI;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for OpenAPI documentation
 *
 * Singleton resource providing OpenAPI specification and metadata utilities.
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes OpenAPI documentation parameter definitions.
     * OpenAPI is a singleton resource providing API documentation.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'format' => [
                    'type' => 'string',
                    'description' => 'rest_param_openapi_format',
                    'enum' => ['json', 'yaml'],
                    'default' => 'json',
                    'sanitize' => 'string',
                    'example' => 'json'
                ]
            ],
            'response' => [
                // Singleton resource has no persistent data model
                // Responses are generated dynamically by OpenAPI generator
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

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

namespace MikoPBX\PBXCoreREST\Lib\Search;

use MikoPBX\PBXCoreREST\Lib\AbstractDataStructure;

/**
 * Data structure definitions for global search API.
 *
 * Defines schema for search items including validation rules,
 * data types, and response formats.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Search
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Get parameter definitions for global search
     *
     * @return array{request: array<string, array>, response: array<string, array>}
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Search query to filter results (searches by name, number, or searchIndex)',
                    'example' => '201',
                    'sanitize' => 'text',
                    'required' => false
                ]
            ],
            'response' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'Display name of the search result item (may contain HTML)',
                    'example' => '<i class="user icon"></i> John Doe'
                ],
                'value' => [
                    'type' => 'string',
                    'description' => 'URL/link to the item',
                    'example' => '/admin-cabinet/extensions/modify/201'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'Item category/type in uppercase with underscores',
                    'example' => 'USERS'
                ],
                'typeLocalized' => [
                    'type' => 'string',
                    'description' => 'Localized/translated category name',
                    'example' => 'Users'
                ],
                'sorter' => [
                    'type' => 'string',
                    'description' => 'Plain text for sorting (HTML tags stripped)',
                    'example' => 'John Doe'
                ]
            ]
        ];
    }

    /**
     * Get sanitization rules (not applicable for this endpoint)
     *
     * @return array<string, string>
     */
    public static function getSanitizationRules(): array
    {
        return [];
    }
}

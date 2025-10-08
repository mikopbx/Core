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


namespace MikoPBX\PBXCoreREST\Lib\Users;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Users
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Users
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{

    /**
     * Create data structure from model instance
     *
     * @param object $model The Users model instance
     * @return array<string, mixed> The structured data array
     */
    public static function createFromModel($model): array
    {
        $data = self::createBaseStructure($model);
        $data['id'] = (int)$model->id;
        $data['email'] = $model->email ?? '';
        $data['username'] = $model->username ?? '';
        $data['language'] = $model->language ?? 'en';
        $data['avatar'] = $model->avatar ?? null;

        return $data;
    }

    /**
     * Create simplified data structure for list view
     *
     * @param object $model The Users model instance
     * @return array<string, mixed> Simplified data structure
     */
    public static function createForList($model): array
    {
        return [
            'id' => (int)$model->id,
            'email' => $model->email ?? '',
            'username' => $model->username ?? '',
            'language' => $model->language ?? 'en',
            'avatar' => $model->avatar ?? null
        ];
    }

    /**
     * Get OpenAPI schema for user list item
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'email', 'username'],
            'properties' => [
                'id' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_users_id',
                    'example' => 1
                ],
                'email' => [
                    'type' => 'string',
                    'format' => 'email',
                    'description' => 'rest_schema_users_email',
                    'maxLength' => 255,
                    'example' => 'admin@example.com'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_username',
                    'minLength' => 3,
                    'maxLength' => 50,
                    'example' => 'admin'
                ],
                'language' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_language',
                    'enum' => ['en', 'ru', 'de', 'es', 'fr', 'pt', 'uk', 'it', 'cs', 'tr', 'ja', 'vi', 'zh_Hans', 'pl', 'sv', 'nl', 'ka', 'ar', 'az', 'fa', 'ro'],
                    'default' => 'en',
                    'example' => 'en'
                ],
                'avatar' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_avatar',
                    'maxLength' => 500,
                    'nullable' => true,
                    'example' => '/assets/img/avatars/admin.png'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed user record
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'email', 'username'],
            'properties' => [
                'id' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_users_id',
                    'readOnly' => true,
                    'example' => 1
                ],
                'email' => [
                    'type' => 'string',
                    'format' => 'email',
                    'description' => 'rest_schema_users_email',
                    'maxLength' => 255,
                    'example' => 'admin@example.com'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_username',
                    'minLength' => 3,
                    'maxLength' => 50,
                    'example' => 'admin'
                ],
                'language' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_language',
                    'enum' => ['en', 'ru', 'de', 'es', 'fr', 'pt', 'uk', 'it', 'cs', 'tr', 'ja', 'vi', 'zh_Hans', 'pl', 'sv', 'nl', 'ka', 'ar', 'az', 'fa', 'ro'],
                    'default' => 'en',
                    'example' => 'en'
                ],
                'avatar' => [
                    'type' => 'string',
                    'description' => 'rest_schema_users_avatar',
                    'maxLength' => 500,
                    'nullable' => true,
                    'example' => '/assets/img/avatars/admin.png'
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'UserAvailability' => [
                'type' => 'object',
                'required' => ['available', 'email'],
                'properties' => [
                    'available' => [
                        'type' => 'boolean',
                        'description' => 'rest_schema_users_available',
                        'example' => true
                    ],
                    'email' => [
                        'type' => 'string',
                        'format' => 'email',
                        'description' => 'rest_schema_users_email',
                        'example' => 'test@example.com'
                    ]
                ]
            ]
        ];
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
            'email' => 'string|email|max:255',
            'username' => 'string|min:3|max:50',
            'language' => 'string|in:en,ru,de,es,fr,pt,uk,it,cs,tr,ja,vi,zh_Hans,pl,sv,nl,ka,ar,az,fa,ro',
            'avatar' => 'string|max:500|empty_to_null'
        ];
    }
}

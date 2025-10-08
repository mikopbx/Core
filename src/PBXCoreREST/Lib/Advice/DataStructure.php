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

namespace MikoPBX\PBXCoreREST\Lib\Advice;

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for system advice and notifications
 *
 * Provides OpenAPI schemas for system advice responses including security warnings,
 * configuration recommendations, and system health notifications.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Advice
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Format advice data for API response
     *
     * @param array<string, array<int, array<string, mixed>>> $adviceData Raw advice data from cache
     * @return array<string, mixed> Formatted advice structure
     */
    public static function formatAdviceData(array $adviceData): array
    {
        $data = ['advice' => $adviceData];

        // Apply OpenAPI schema formatting
        return self::formatBySchema($data, 'list');
    }

    /**
     * Get OpenAPI schema for advice list response
     *
     * This schema matches the structure returned by GetAdviceListAction.
     * Used for GET /api/v3/advice endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'advice' => [
                    'type' => 'object',
                    'description' => 'rest_schema_advice_advice',
                    'additionalProperties' => [
                        'type' => 'array',
                        'items' => [
                            '$ref' => '#/components/schemas/AdviceItem'
                        ]
                    ],
                    'example' => [
                        'security' => [
                            [
                                'messageTpl' => 'adv_weak_password_detected',
                                'messageParams' => ['extension' => '200'],
                                'severity' => 'warning',
                                'category' => 'security'
                            ]
                        ],
                        'configuration' => [
                            [
                                'messageTpl' => 'adv_voicemail_not_configured',
                                'messageParams' => [],
                                'severity' => 'info',
                                'category' => 'configuration'
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed advice record
     *
     * Since Advice is a read-only resource, detail schema is same as list.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return self::getListItemSchema();
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in advice responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'AdviceItem' => [
                'type' => 'object',
                'required' => ['messageTpl', 'severity', 'category'],
                'properties' => [
                    'messageTpl' => [
                        'type' => 'string',
                        'description' => 'rest_schema_advice_message_tpl',
                        'example' => 'adv_weak_password_detected'
                    ],
                    'messageParams' => [
                        'type' => 'object',
                        'description' => 'rest_schema_advice_message_params',
                        'additionalProperties' => true,
                        'example' => ['extension' => '200']
                    ],
                    'severity' => [
                        'type' => 'string',
                        'description' => 'rest_schema_advice_severity',
                        'enum' => ['critical', 'warning', 'info'],
                        'example' => 'warning'
                    ],
                    'category' => [
                        'type' => 'string',
                        'description' => 'rest_schema_advice_category',
                        'enum' => ['security', 'configuration', 'performance', 'maintenance', 'updates'],
                        'example' => 'security'
                    ]
                ]
            ]
        ];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * For Advice this is minimal since it's a read-only resource.
     *
     * @return array<string, string> Sanitization rules
     */
    public static function getSanitizationRules(): array
    {
        return [
            'category' => 'string|in:security,configuration,performance,maintenance,updates',
            'severity' => 'string|in:critical,warning,info',
            'force' => 'bool'
        ];
    }
}

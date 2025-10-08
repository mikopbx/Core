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

namespace MikoPBX\PBXCoreREST\Lib\Fail2Ban;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Fail2Ban singleton resource
 *
 * Creates consistent data format for API responses.
 * Fail2Ban is a singleton resource - there's only one configuration in the system.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Fail2Ban
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create data array from Fail2BanRules model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input.
     *
     * @param \MikoPBX\Common\Models\Fail2BanRules $model Fail2Ban rules model instance
     * @param string|null $maxReqPerSec Max requests per second from PbxSettings
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model, ?string $maxReqPerSec = null): array
    {
        // Get max requests per second if not provided
        if ($maxReqPerSec === null) {
            $maxReqPerSec = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_MAX_REQ);
        }

        $data = [
            'maxretry' => $model->maxretry,
            'bantime' => $model->bantime,
            'findtime' => $model->findtime,
            'whitelist' => $model->whitelist ?? '',
            'PBXFirewallMaxReqSec' => $maxReqPerSec,
        ];

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create default structure for new Fail2Ban configuration
     *
     * @return array<string, mixed> Default Fail2Ban data structure
     */
    public static function createDefault(): array
    {
        $data = [
            'maxretry' => 5,
            'bantime' => 86400,
            'findtime' => 1800,
            'whitelist' => '',
            'PBXFirewallMaxReqSec' => '100',
        ];

        return $data;
    }

    /**
     * Get OpenAPI schema for Fail2Ban singleton resource
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/fail2ban, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['maxretry', 'bantime', 'findtime'],
            'properties' => [
                'maxretry' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_f2b_maxretry',
                    'minimum' => 1,
                    'maximum' => 100,
                    'default' => 5,
                    'example' => 5
                ],
                'bantime' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_f2b_bantime',
                    'minimum' => 60,
                    'default' => 86400,
                    'example' => 86400
                ],
                'findtime' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_f2b_findtime',
                    'minimum' => 60,
                    'default' => 1800,
                    'example' => 1800
                ],
                'whitelist' => [
                    'type' => 'string',
                    'description' => 'rest_schema_f2b_whitelist',
                    'maxLength' => 500,
                    'example' => '192.168.1.0/24,10.0.0.0/8'
                ],
                'PBXFirewallMaxReqSec' => [
                    'type' => 'string',
                    'description' => 'rest_schema_f2b_maxreqsec',
                    'maxLength' => 10,
                    'default' => '100',
                    'example' => '100'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for list (same as detail for singleton)
     *
     * For singleton resources, list and detail schemas are identical.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * Converts OpenAPI schema constraints into SystemSanitizer format.
     * This eliminates duplication between schema definition and validation rules.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        $schema = static::getDetailSchema();
        $rules = [];

        if (!isset($schema['properties'])) {
            return $rules;
        }

        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            $ruleParts = [];

            // Add type
            $type = $fieldSchema['type'] ?? 'string';
            $ruleParts[] = match ($type) {
                'integer' => 'int',
                'number' => 'float',
                'boolean' => 'bool',
                'array' => 'array',
                default => 'string'
            };

            // Add constraints
            if (isset($fieldSchema['minimum'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minimum'];
            }
            if (isset($fieldSchema['maximum'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maximum'];
            }
            if (isset($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['pattern']) && is_string($fieldSchema['pattern'])) {
                $pattern = str_replace('^', '', $fieldSchema['pattern']);
                $pattern = str_replace('$', '', $pattern);
                $ruleParts[] = 'regex:/' . $pattern . '/';
            }
            if (isset($fieldSchema['enum']) && is_array($fieldSchema['enum'])) {
                $ruleParts[] = 'in:' . implode(',', $fieldSchema['enum']);
            }
            if (isset($fieldSchema['nullable']) && $fieldSchema['nullable'] === true) {
                $ruleParts[] = 'empty_to_null';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }

    /**
     * Get related schemas
     *
     * @return array<string> List of related schema names
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }
}

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

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;

/**
 * Data structure for firewall rules with network filter representations
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;

    /**
     * Create data array from NetworkFilters model with FirewallRules
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input.
     *
     * @param \MikoPBX\Common\Models\NetworkFilters $model Network filter model instance
     * @return array<string, mixed> Complete data structure
     */
    public static function createFromModel($model): array
    {
        $data = [
            'id' => $model->id,
            'permit' => $model->permit ?? '',
            'deny' => $model->deny ?? '',
            'description' => $model->description ?? '',
            'newer_block_ip' => $model->newer_block_ip === '1',
            'local_network' => $model->local_network === '1',
        ];

        // Get all firewall rules for this network filter
        $rules = [];
        if ($model->FirewallRules) {
            foreach ($model->FirewallRules as $rule) {
                $category = $rule->category;
                if (!isset($rules[$category])) {
                    $rules[$category] = $rule->action;
                }
            }
        }
        $data['rules'] = $rules;

        // Add represent field for list display
        $data['represent'] = '<i class="shield alternate icon"></i> ' . ($model->description ?: $model->permit);

        // Generate search index automatically
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\NetworkFilters $model Network filter model instance
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        $data = parent::createForList($model);

        $data['id'] = $model->id;
        $data['permit'] = $model->permit ?? '';
        $data['description'] = $model->description ?? '';
        $data['represent'] = '<i class="shield alternate icon"></i> ' . ($model->description ?: $model->permit);

        // Count active rules
        $activeRules = 0;
        if ($model->FirewallRules) {
            foreach ($model->FirewallRules as $rule) {
                if ($rule->action === 'allow') {
                    $activeRules++;
                }
            }
        }
        $data['active_rules'] = $activeRules;

        // Generate search index
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI list schema formatting
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Create default structure for new firewall rule
     *
     * @return array<string, mixed> Default firewall rule data structure
     */
    public static function createDefault(): array
    {
        return [
            'id' => '',
            'permit' => '',
            'deny' => '',
            'description' => '',
            'newer_block_ip' => false,
            'local_network' => false,
            'rules' => [
                'SIP' => 'allow',
                'WEB' => 'allow',
                'SSH' => 'block',
                'AMI' => 'block',
                'CTI' => 'block',
                'ICMP' => 'allow',
            ],
        ];
    }

    /**
     * Get OpenAPI schema for firewall rule list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/firewall endpoint (list of rules).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'permit'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_id',
                    'example' => '1'
                ],
                'permit' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_permit',
                    'maxLength' => 100,
                    'example' => '192.168.1.0/24'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_description',
                    'maxLength' => 255,
                    'example' => 'Local network'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_represent',
                    'example' => '<i class="shield alternate icon"></i> Local network'
                ],
                'active_rules' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_fw_active_rules',
                    'minimum' => 0,
                    'example' => 3
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_search_index',
                    'example' => 'local network 192.168.1.0/24'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed firewall rule record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/firewall/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['permit'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_id',
                    'example' => '1'
                ],
                'permit' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_permit',
                    'maxLength' => 100,
                    'example' => '192.168.1.0/24'
                ],
                'deny' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_deny',
                    'maxLength' => 100,
                    'example' => ''
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_description',
                    'maxLength' => 255,
                    'example' => 'Local network'
                ],
                'newer_block_ip' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_fw_newer_block_ip',
                    'default' => false,
                    'example' => false
                ],
                'local_network' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_fw_local_network',
                    'default' => false,
                    'example' => false
                ],
                'rules' => [
                    'type' => 'object',
                    'description' => 'rest_schema_fw_rules',
                    'additionalProperties' => [
                        'type' => 'string',
                        'enum' => ['allow', 'block']
                    ],
                    'example' => [
                        'SIP' => 'allow',
                        'WEB' => 'allow',
                        'SSH' => 'block',
                        'AMI' => 'block',
                        'CTI' => 'block',
                        'ICMP' => 'allow'
                    ]
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_represent',
                    'example' => '<i class="shield alternate icon"></i> Local network'
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_fw_search_index',
                    'example' => 'local network 192.168.1.0/24'
                ]
            ]
        ];
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
                'object' => 'array', // Objects are handled as arrays in PHP
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

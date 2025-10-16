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
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit request parameters used in list view
        $listFields = ['permit', 'description'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'represent', 'active_rules', 'search_index'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'permit'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed firewall rule record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/firewall/{id}, POST, PUT, PATCH endpoints.
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for detail view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            // Skip readOnly fields (like 'permit' which is calculated from network/subnet)
            // Actually, permit IS included in responses, so don't skip it
            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = ['id', 'represent', 'search_index', 'rules'];
        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['permit'],
            'properties' => $properties
        ];
    }

    /**
     * Single Source of Truth for ALL field definitions
     *
     * Centralizes all field metadata in one location:
     * - Data types and validation constraints
     * - Sanitization rules for security
     * - Default values for new records
     * - Read-only vs writable fields
     * - OpenAPI documentation and examples
     *
     * This method eliminates duplication between request/response schemas.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ========== WRITABLE FIELDS ==========
            'network' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_network',
                'pattern' => '^(\d{1,3}\.){3}\d{1,3}$', // IPv4 format
                'sanitize' => 'string',
                'required' => true, // Required for CREATE
                'example' => '192.168.1.0'
            ],
            'subnet' => [
                'type' => 'integer',
                'description' => 'rest_schema_fw_subnet',
                'minimum' => 0,
                'maximum' => 32, // CIDR notation for IPv4
                'sanitize' => 'int',
                'required' => true, // Required for CREATE
                'example' => 24
            ],
            'permit' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_permit',
                'maxLength' => 100,
                'sanitize' => 'string',
                'readOnly' => true, // Calculated from network/subnet
                'example' => '192.168.1.0/24'
            ],
            'deny' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_deny',
                'maxLength' => 100,
                'sanitize' => 'string',
                'default' => '0.0.0.0/0',
                'example' => '0.0.0.0/0'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_description',
                'maxLength' => 255,
                'sanitize' => 'text',
                'default' => '',
                'example' => 'Local network'
            ],
            'newer_block_ip' => [
                'type' => 'boolean',
                'description' => 'rest_schema_fw_newer_block_ip',
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ],
            'local_network' => [
                'type' => 'boolean',
                'description' => 'rest_schema_fw_local_network',
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ],
            'currentRules' => [
                'type' => 'object',
                'description' => 'rest_schema_fw_current_rules',
                'additionalProperties' => [
                    'type' => 'boolean'
                ],
                'sanitize' => 'array', // Special handling in SaveRecordAction
                'default' => [
                    'SIP' => true,
                    'WEB' => true,
                    'SSH' => false,
                    'AMI' => false,
                    'CTI' => false,
                    'ICMP' => true,
                ],
                'example' => [
                    'SIP' => true,
                    'WEB' => true,
                    'SSH' => false,
                    'AMI' => false,
                    'CTI' => false,
                    'ICMP' => true
                ]
            ],
            // ========== RESPONSE-ONLY FIELDS ==========
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '1'
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_represent',
                'readOnly' => true,
                'example' => '<i class="shield alternate icon"></i> Local network'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_fw_search_index',
                'readOnly' => true,
                'example' => 'local network 192.168.1.0/24'
            ],
            'active_rules' => [
                'type' => 'integer',
                'description' => 'rest_schema_fw_active_rules',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 3
            ],
            'rules' => [
                'type' => 'object',
                'description' => 'rest_schema_fw_rules',
                'additionalProperties' => [
                    'type' => 'string',
                    'enum' => ['allow', 'block']
                ],
                'readOnly' => true,
                'example' => [
                    'SIP' => 'allow',
                    'WEB' => 'allow',
                    'SSH' => 'block',
                    'AMI' => 'block',
                    'CTI' => 'block',
                    'ICMP' => 'allow'
                ]
            ]
        ];
    }

    /**
     * Get parameter definitions for firewall rules
     *
     * Uses getAllFieldDefinitions() as Single Source of Truth.
     * Separates writable fields (request) from response-only fields.
     *
     * Structure:
     * - 'request': Writable fields (excluded readOnly fields)
     * - 'response': All fields including response-only
     *
     * @return array<string, array<string, array<string, mixed>>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and all fields (for response)
        $writableFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (empty($fieldDef['readOnly'])) {
                // For request section, use rest_param_* descriptions
                $requestField = $fieldDef;
                $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
                $writableFields[$fieldName] = $requestField;
            }
        }

        return [
            // ========== REQUEST PARAMETERS ==========
            // Used in API requests (POST, PUT, PATCH)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE FIELDS ==========
            // All fields including response-only
            // Used by getListItemSchema() and getDetailSchema()
            'response' => $allFields,

            // ========== RELATED SCHEMAS ==========
            // Custom method parameters and nested schemas
            'related' => [
                // Custom method: unbanIp
                'ip' => [
                    'type' => 'string',
                    'description' => 'rest_param_fw_ip',
                    'required' => true,
                    'maxLength' => 45,
                    'sanitize' => 'string',
                    'example' => '192.168.1.100'
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

}

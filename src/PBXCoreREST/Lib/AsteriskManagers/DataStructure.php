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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Asterisk Managers with OpenAPI schema support
 *
 * Provides consistent data format for Asterisk Manager Interface (AMI) user records.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create complete data array from AsteriskManagerUsers model.
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel($model): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);

        // Add Asterisk manager specific fields
        $data['username'] = $model->username ?? '';
        $data['secret'] = $model->secret ?? '';
        $data['read'] = $permissions['read'];
        $data['write'] = $permissions['write'];
        $data['networkfilterid'] = !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none';

        // Get network filter representation using unified helper
        $data['networkfilter_represent'] = self::getNetworkFilterRepresentation($model->networkfilterid);

        // Parse permissions into boolean fields for easier frontend handling
        $data['permissions'] = self::parsePermissionsToBoolean($permissions['read'], $permissions['write']);

        // Add system flag for protected managers
        $data['isSystem'] = self::isSystemManager($model->username);

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields(), handleNullValues(), etc.
        // The schema defines which fields should be boolean, integer, or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data array for list view.
     *
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);

        // Add Asterisk manager specific fields for list display
        $data['username'] = $model->username ?? '';
        $data['networkfilterid'] = !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none';

        // Add permission summary
        $data['readPermissionsSummary'] = self::getPermissionsSummary($permissions['read']);
        $data['writePermissionsSummary'] = self::getPermissionsSummary($permissions['write']);

        // Add system flag
        $data['isSystem'] = self::isSystemManager($model->username);

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Create data structure for dropdown/select options.
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'represent' => $model->username . (!empty($model->description) ? ' - ' . $model->description : ''),
        ];
    }

    /**
     * Extract permissions from model and return as comma-separated strings.
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array ['read' => string, 'write' => string]
     */
    private static function extractPermissionsFromModel($model): array
    {
        $availablePermissions = self::getAvailablePermissions();
        
        $readPerms = [];
        $writePerms = [];
        
        foreach ($availablePermissions as $perm) {
            $permValue = $model->$perm ?? '';
            if (strpos($permValue, 'read') !== false) {
                $readPerms[] = $perm;
            }
            if (strpos($permValue, 'write') !== false) {
                $writePerms[] = $perm;
            }
        }
        
        return [
            'read' => implode(',', $readPerms),
            'write' => implode(',', $writePerms)
        ];
    }
    
    /**
     * Get list of available permission categories.
     * 
     * @return array
     */
    private static function getAvailablePermissions(): array
    {
        return [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
    }
    
    /**
     * Check if username belongs to system manager.
     * 
     * @param string|null $username
     * @return bool
     */
    private static function isSystemManager(?string $username): bool
    {
        $systemManagers = ['mikopbxuser', 'phpagi', 'admin'];
        return in_array($username, $systemManagers, true);
    }
    
    /**
     * Parse permissions strings into boolean fields.
     * 
     * @param string $readPermissions Comma-separated read permissions
     * @param string $writePermissions Comma-separated write permissions
     * @return array Boolean fields for each permission
     */
    public static function parsePermissionsToBoolean(string $readPermissions, string $writePermissions): array
    {
        $availablePermissions = self::getAvailablePermissions();
        
        $readArray = !empty($readPermissions) ? array_map('trim', explode(',', $readPermissions)) : [];
        $writeArray = !empty($writePermissions) ? array_map('trim', explode(',', $writePermissions)) : [];
        
        $result = [];
        foreach ($availablePermissions as $perm) {
            $result[$perm . '_read'] = in_array($perm, $readArray, true) || in_array('all', $readArray, true);
            $result[$perm . '_write'] = in_array($perm, $writeArray, true) || in_array('all', $writeArray, true);
        }
        
        return $result;
    }
    
    /**
     * Parse permissions string into array.
     * 
     * @param string $permissions Comma-separated permissions
     * @return array
     */
    private static function parsePermissions(string $permissions): array
    {
        if (empty($permissions)) {
            return [];
        }

        return array_map('trim', explode(',', $permissions));
    }

    /**
     * Get permissions summary for list display.
     * 
     * @param string $permissions Comma-separated permissions
     * @return string
     */
    private static function getPermissionsSummary(string $permissions): string
    {
        if (empty($permissions)) {
            return 'none';
        }

        $perms = self::parsePermissions($permissions);
        
        if (in_array('all', $perms, true)) {
            return 'all';
        }

        // Show all permissions without truncation
        return implode(', ', $perms);
    }

    /**
     * Create default data structure for a new AMI manager.
     *
     * @return array
     */
    public static function createForNewManager(): array
    {
        // Generate secure random password
        $secret = \MikoPBX\Common\Models\AsteriskManagerUsers::generateAMIPassword();

        $data = [
            'id' => '',
            'username' => '',
            'secret' => $secret,
            'read' => '',
            'write' => '',
            'description' => '',
            'networkfilterid' => 'none',
            'networkfilter_represent' => self::getNetworkFilterRepresentation('none'),
            'permissions' => self::parsePermissionsToBoolean('', ''),
            'isSystem' => false
        ];

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data);

        return $data;
    }

    /**
     * Get OpenAPI schema for Asterisk manager list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/asterisk-managers endpoint (list of managers).
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'username'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '53'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_username',
                    'maxLength' => 50,
                    'example' => 'admin'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_description',
                    'maxLength' => 255,
                    'example' => 'Administrator account'
                ],
                'networkfilterid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_networkfilterid',
                    'pattern' => '^([0-9]+|none)$',
                    'default' => 'none',
                    'example' => '5'
                ],
                'readPermissionsSummary' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_read_permissions_summary',
                    'example' => 'call, cdr, agent'
                ],
                'writePermissionsSummary' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_write_permissions_summary',
                    'example' => 'all'
                ],
                'isSystem' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_am_is_system',
                    'example' => false
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed Asterisk manager record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/asterisk-managers/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $permissionFields = [];
        $availablePermissions = self::getAvailablePermissions();

        // Generate schema for each permission boolean field
        foreach ($availablePermissions as $perm) {
            $permissionFields[$perm . '_read'] = [
                'type' => 'boolean',
                'description' => "rest_schema_am_perm_{$perm}_read",
                'example' => false
            ];
            $permissionFields[$perm . '_write'] = [
                'type' => 'boolean',
                'description' => "rest_schema_am_perm_{$perm}_write",
                'example' => false
            ];
        }

        return [
            'type' => 'object',
            'required' => ['id', 'username', 'secret'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_id',
                    'pattern' => '^[0-9]+$',
                    'example' => '53'
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_username',
                    'maxLength' => 50,
                    'example' => 'admin'
                ],
                'secret' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_secret',
                    'maxLength' => 255,
                    'example' => 'securePassword123'
                ],
                'read' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_read',
                    'example' => 'call,cdr,agent'
                ],
                'write' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_write',
                    'example' => 'all'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_description',
                    'maxLength' => 255,
                    'example' => 'Administrator account'
                ],
                'networkfilterid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_networkfilterid',
                    'pattern' => '^([0-9]+|none)$',
                    'default' => 'none',
                    'example' => '5'
                ],
                'networkfilter_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_am_networkfilter_represent',
                    'example' => '<i class="filter icon"></i> Office Network'
                ],
                'permissions' => [
                    'type' => 'object',
                    'description' => 'rest_schema_am_permissions',
                    'properties' => $permissionFields
                ],
                'isSystem' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_am_is_system',
                    'example' => false
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
        return [];
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
            // Skip computed/read-only fields
            if (in_array($fieldName, ['isSystem', 'networkfilter_represent', 'permissions', 'readPermissionsSummary', 'writePermissionsSummary'])) {
                continue;
            }

            $ruleParts = [];

            // Add type
            $type = $fieldSchema['type'] ?? 'string';
            $ruleParts[] = match ($type) {
                'integer' => 'int',
                'number' => 'float',
                'boolean' => 'bool',
                'array' => 'array',
                'object' => 'array',
                default => 'string'
            };

            // Add constraints
            if (isset($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['pattern']) && is_string($fieldSchema['pattern'])) {
                $pattern = str_replace('^', '', $fieldSchema['pattern']);
                $pattern = str_replace('$', '', $pattern);
                $ruleParts[] = 'regex:/' . $pattern . '/';
            }
            if (isset($fieldSchema['nullable']) && $fieldSchema['nullable'] === true) {
                $ruleParts[] = 'empty_to_null';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }
}
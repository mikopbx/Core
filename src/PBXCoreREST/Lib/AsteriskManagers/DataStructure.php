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
     * System managers that cannot be modified or deleted.
     */
    public const SYSTEM_MANAGERS = ['mikopbxuser', 'phpagi', 'admin'];
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

        // Remove fields not applicable to AMI users
        // WHY: AMI users don't have uniqid (numeric ID is sufficient) or extension (not phone numbers)
        unset($data['uniqid'], $data['extension']);

        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);

        // Add Asterisk manager specific fields
        $data['username'] = $model->username ?? '';
        $data['secret'] = $model->secret ?? '';
        $data['read'] = $permissions['read'];
        $data['write'] = $permissions['write'];
        $data['networkfilterid'] = !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none';
        $data['eventfilter'] = $model->eventfilter ?? '';

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

        // Remove fields not applicable to AMI users
        // WHY: AMI users don't have uniqid (numeric ID is sufficient) or extension (not phone numbers)
        unset($data['uniqid'], $data['extension']);

        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);

        // Add Asterisk manager specific fields for list display
        $data['username'] = $model->username ?? '';
        $data['networkfilterid'] = !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none';

        // Add represent field for dropdowns (username - description)
        $data['represent'] = $model->username . (!empty($model->description) ? ' - ' . $model->description : '');

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
     * @return array<string, mixed>
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
     * @return array<string, string> ['read' => string, 'write' => string]
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
     * @return list<string>
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
    public static function isSystemManager(?string $username): bool
    {
        return in_array($username, self::SYSTEM_MANAGERS, true);
    }
    
    /**
     * Parse permissions strings into boolean fields.
     *
     * @param string $readPermissions Comma-separated read permissions
     * @param string $writePermissions Comma-separated write permissions
     * @return array<string, bool> Boolean fields for each permission
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
     * @return list<string>
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
     * @return array<string, mixed>
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
        $listFields = ['username', 'description', 'networkfilterid'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'readPermissionsSummary', 'writePermissionsSummary', 'isSystem', 'represent'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'username'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed Asterisk manager record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/asterisk-managers/{id}, POST, PUT, PATCH endpoints.
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
            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = ['id', 'read', 'write', 'permissions', 'networkfilter_represent', 'isSystem'];
        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'username', 'secret'],
            'properties' => $properties
        ];
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        $availablePermissions = self::getAvailablePermissions();

        // Build permission fields dynamically
        $permissionFields = [];
        foreach ($availablePermissions as $perm) {
            $permissionFields[$perm . '_read'] = [
                'type' => 'boolean',
                'description' => "rest_schema_am_perm_{$perm}_read",
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ];
            $permissionFields[$perm . '_write'] = [
                'type' => 'boolean',
                'description' => "rest_schema_am_perm_{$perm}_write",
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ];
        }

        return [
            // ========== WRITABLE FIELDS ==========
            'username' => [
                'type' => 'string',
                'description' => 'rest_schema_am_username',
                'minLength' => 1,
                'maxLength' => 50,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'admin'
            ],
            'secret' => [
                'type' => 'string',
                'description' => 'rest_schema_am_secret',
                'maxLength' => 255,
                'sanitize' => 'string',
                'required' => true, // Required for CREATE, but auto-generated if empty
                'example' => 'securePassword123'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_am_description',
                'maxLength' => 255,
                'sanitize' => 'text',
                'default' => '',
                'example' => 'Administrator account'
            ],
            'networkfilterid' => [
                'type' => 'string',
                'description' => 'rest_schema_am_networkfilterid',
                'pattern' => '^([0-9]+|none)$',
                'sanitize' => 'string',
                'default' => 'none',
                'example' => 'none'
            ],
            'eventfilter' => [
                'type' => 'string',
                'description' => 'rest_schema_am_eventfilter',
                'maxLength' => 2000,
                'sanitize' => 'text',
                'default' => '',
                'example' => "!Event: Newexten\n!UserEvent: CdrConnector\nEvent: QueueMemberStatus"
            ],
            'permissions' => [
                'type' => 'object',
                'description' => 'rest_schema_am_permissions',
                'properties' => $permissionFields,
                'sanitize' => 'array', // Special handling in SaveRecordAction
                'readOnly' => true, // Computed from read/write strings
                'example' => [
                    'call_read' => true,
                    'call_write' => false,
                    'cdr_read' => true,
                    'cdr_write' => false,
                    'originate_read' => false,
                    'originate_write' => false,
                    'reporting_read' => true,
                    'reporting_write' => false,
                    'agent_read' => true,
                    'agent_write' => true,
                    'config_read' => false,
                    'config_write' => false,
                    'dialplan_read' => false,
                    'dialplan_write' => false,
                    'dtmf_read' => false,
                    'dtmf_write' => false,
                    'log_read' => false,
                    'log_write' => false,
                    'system_read' => false,
                    'system_write' => false,
                    'user_read' => true,
                    'user_write' => false,
                    'verbose_read' => false,
                    'verbose_write' => false,
                    'command_read' => false,
                    'command_write' => false
                ]
            ],
            'read' => [
                'type' => 'string',
                'description' => 'rest_schema_am_read',
                'sanitize' => 'string',
                'readOnly' => true, // Calculated from permissions
                'example' => 'call,cdr,agent'
            ],
            'write' => [
                'type' => 'string',
                'description' => 'rest_schema_am_write',
                'sanitize' => 'string',
                'readOnly' => true, // Calculated from permissions
                'example' => 'all'
            ],

            // ========== READ-ONLY FIELDS ==========
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_am_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '53'
            ],
            'networkfilter_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_am_networkfilter_represent',
                'readOnly' => true,
                'example' => '<i class="filter icon"></i> Office Network'
            ],
            'isSystem' => [
                'type' => 'boolean',
                'description' => 'rest_schema_am_is_system',
                'readOnly' => true,
                'example' => false
            ],
            'readPermissionsSummary' => [
                'type' => 'string',
                'description' => 'rest_schema_am_read_permissions_summary',
                'readOnly' => true,
                'example' => 'call, cdr, agent'
            ],
            'writePermissionsSummary' => [
                'type' => 'string',
                'description' => 'rest_schema_am_write_permissions_summary',
                'readOnly' => true,
                'example' => 'all'
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_am_represent',
                'readOnly' => true,
                'example' => 'admin - Administrator account'
            ]
        ];
    }

    /**
     * Get parameter definitions for Asterisk managers (Single Source of Truth)
     *
     * Defines all field properties in one central location:
     * - Data types and validation constraints
     * - Sanitization rules for security
     * - Default values for new records
     * - OpenAPI documentation
     *
     * @return array<string, array<string, array<string, mixed>>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and response-only fields
        $writableFields = [];
        $responseOnlyFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                $responseOnlyFields[$fieldName] = $fieldDef;
            } else {
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

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getListItemSchema() and getDetailSchema()
            'response' => $responseOnlyFields
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
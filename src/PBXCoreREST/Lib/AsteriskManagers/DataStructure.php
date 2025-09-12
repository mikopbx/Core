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

/**
 * Data structure for Asterisk Managers.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from AsteriskManagerUsers model.
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);
        
        $data = [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'secret' => $model->secret ?? '',
            'read' => $permissions['read'],
            'write' => $permissions['write'],
            'description' => $model->description ?? '',
            'networkfilterid' => !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none',
        ];
        
        // Get network filter representation using unified helper
        $data['networkfilter_represent'] = self::getNetworkFilterRepresentation($model->networkfilterid);

        // Parse permissions into boolean fields for easier frontend handling
        $data['permissions'] = self::parsePermissionsToBoolean($permissions['read'], $permissions['write']);

        // Add system flag for protected managers
        $data['isSystem'] = self::isSystemManager($model->username);

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data);

        return $data;
    }

    /**
     * Create simplified data array for list view.
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createForList($model): array
    {
        // Build permission strings from model
        $permissions = self::extractPermissionsFromModel($model);
        
        $data = [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'description' => $model->description ?? '',
            'networkfilterid' => !empty($model->networkfilterid) ? (string)$model->networkfilterid : 'none',
        ];

        // Add permission summary
        $data['readPermissionsSummary'] = self::getPermissionsSummary($permissions['read']);
        $data['writePermissionsSummary'] = self::getPermissionsSummary($permissions['write']);

        // Add system flag
        $data['isSystem'] = self::isSystemManager($model->username);

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data);

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
}
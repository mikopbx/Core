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

namespace MikoPBX\PBXCoreREST\Lib\Passwords;

/**
 * Helper class for mapping field names to validation contexts
 * 
 * Provides centralized mapping logic for converting various field name formats
 * to standardized validation contexts used by PasswordValidator.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Passwords
 */
class FieldContextMapper
{
    /**
     * Map field name to validation context
     *
     * Converts various field name formats (camelCase, UPPER_CASE, snake_case)
     * to standardized validation contexts for PasswordValidator.
     *
     * @param string $field Field name from request
     * @return string|null Validation context for PasswordValidator, null if empty field
     */
    public static function mapFieldToContext(string $field): ?string
    {
        if (empty($field)) {
            return null;
        }

        // Handle various field name formats
        return match($field) {
            // Web admin password variations
            'WebAdminPassword', 'WEB_ADMIN_PASSWORD', 'web_admin_password' => PasswordValidator::CONTEXT_WEB_ADMIN,
            
            // SSH password variations
            'SSHPassword', 'SSH_PASSWORD', 'ssh_password' => PasswordValidator::CONTEXT_SSH,
            
            // SIP secret variations
            'secret', 'sip_secret', 'SIP_SECRET' => PasswordValidator::CONTEXT_SIP,
            
            // AMI secret variations
            'ami_secret', 'AMI_SECRET' => PasswordValidator::CONTEXT_AMI,
            
            // Provider secret variations
            'provider_secret', 'PROVIDER_SECRET' => PasswordValidator::CONTEXT_PROVIDER,
            
            // Default: return field as-is for custom contexts
            default => $field
        };
    }

    /**
     * Map multiple fields to contexts
     *
     * Batch maps an array of field names to their corresponding contexts.
     * Useful for batch operations where multiple fields need mapping.
     *
     * @param array<string, mixed> $items Array of items with 'field' keys
     * @return array<string, string> Array of context => original field mapping
     */
    public static function mapFieldsToContexts(array $items): array
    {
        $contextMap = [];
        
        foreach ($items as $index => $item) {
            if (is_array($item) && isset($item['field'])) {
                $context = self::mapFieldToContext($item['field'] ?? '');
                // Use index as fallback if no context
                $contextKey = $context ?? "index_{$index}";
                $contextMap[$contextKey] = $item['field'] ?? '';
            }
        }
        
        return $contextMap;
    }
}
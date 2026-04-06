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

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Password utilities
 *
 * Singleton resource providing password generation and validation utilities.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passwords
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * WHY: Passwords is a singleton resource with utility methods only (no CRUD operations).
     * All fields are writable parameters for password operations.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // Password generation parameters
            'length' => [
                'type' => 'integer',
                'description' => 'rest_schema_pwd_length',
                'minimum' => 8,
                'maximum' => 128,
                'default' => 16,
                'sanitize' => 'int',
                'example' => 16
            ],
            'includeSpecial' => [
                'type' => 'boolean',
                'description' => 'rest_schema_pwd_includeSpecial',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            'includeNumbers' => [
                'type' => 'boolean',
                'description' => 'rest_schema_pwd_includeNumbers',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            'includeUppercase' => [
                'type' => 'boolean',
                'description' => 'rest_schema_pwd_includeUppercase',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            'includeLowercase' => [
                'type' => 'boolean',
                'description' => 'rest_schema_pwd_includeLowercase',
                'default' => true,
                'sanitize' => 'bool',
                'example' => true
            ],
            // Password validation parameters
            'password' => [
                'type' => 'string',
                'description' => 'rest_schema_pwd_password',
                'minLength' => 1,
                'maxLength' => 255,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'MyStr0ng@Pass2024'
            ],
            'field' => [
                'type' => 'string',
                'description' => 'rest_schema_pwd_field',
                'enum' => ['WebAdminPassword', 'SSHPassword', 'AMIPassword', 'SIPPassword'],
                'sanitize' => 'string',
                'example' => 'WebAdminPassword'
            ],
            // Batch operations
            'passwords' => [
                'type' => 'array',
                'description' => 'rest_schema_pwd_passwords',
                'sanitize' => 'array',
                'required' => true,
                'example' => [
                    ['password' => 'Admin123!', 'field' => 'WebAdminPassword'],
                    ['password' => 'SSH@Pass2024', 'field' => 'SSHPassword']
                ]
            ],
            'passwordsList' => [
                'type' => 'array',
                'description' => 'rest_schema_pwd_passwordsList',
                'sanitize' => 'array',
                'required' => true,
                'example' => ['password1', 'admin123', 'MyStr0ng@Pass']
            ],
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes password utility parameter definitions.
     * Passwords is a singleton resource with utility methods only (no CRUD).
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Transform description keys: rest_schema_* → rest_param_*
        $requestFields = [];
        foreach ($allFields as $field => $definition) {
            $requestField = $definition;
            $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $definition['description']);
            $requestFields[$field] = $requestField;
        }

        return [
            'request' => $requestFields,
            'response' => [
                // Singleton resource has no persistent data model
                // Responses are generated dynamically by actions
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

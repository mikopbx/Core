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

namespace MikoPBX\PBXCoreREST\Lib\Auth;

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for authentication API responses
 *
 * Provides OpenAPI schemas for JWT authentication endpoints.
 * Implements OAuth 2.0-like response structure for token management.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Get detail schema for authentication request parameters
     *
     * This schema defines validation rules for login/refresh/logout endpoints.
     * Used to generate sanitization rules and validate incoming requests.
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'login' => [
                    'type' => 'string',
                    'description' => 'rest_param_auth_login',
                    'minLength' => 1,
                    'maxLength' => 255,
                    'example' => 'admin'
                ],
                'password' => [
                    'type' => 'string',
                    'description' => 'rest_param_auth_password',
                    'minLength' => 1,
                    'maxLength' => 255,
                    'example' => 'MySecurePassword123!'
                ],
                'sessionToken' => [
                    'type' => 'string',
                    'description' => 'rest_param_auth_sessionToken',
                    'minLength' => 64,
                    'maxLength' => 64,
                    'pattern' => '^[a-fA-F0-9]{64}$',
                    'example' => 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234'
                ],
                'rememberMe' => [
                    'type' => 'boolean',
                    'description' => 'rest_param_auth_rememberMe',
                    'default' => false,
                    'example' => false
                ],
                'refreshToken' => [
                    'type' => 'string',
                    'description' => 'rest_param_auth_refreshToken',
                    'minLength' => 64,
                    'maxLength' => 500,
                    'example' => 'encrypted_refresh_token_value'
                ],
                'clientIp' => [
                    'type' => 'string',
                    'description' => 'Client IP address for security tracking',
                    'maxLength' => 45,
                    'example' => '192.168.1.100'
                ],
                'userAgent' => [
                    'type' => 'string',
                    'description' => 'User agent string for device tracking',
                    'maxLength' => 500,
                    'example' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                ]
            ]
        ];
    }

    /**
     * Get list item schema (not used for Auth - tokens don't have list views)
     *
     * @return array<string, mixed>
     */
    public static function getListItemSchema(): array
    {
        return [];
    }

    /**
     * Get related schemas for Auth responses
     *
     * @return array<string, array<string, mixed>>
     */
    public static function getRelatedSchemas(): array
    {
        return self::getOpenApiSchemas();
    }

    /**
     * Create login response structure
     *
     * @param string $accessToken JWT access token
     * @param int $expiresIn Seconds until token expires
     * @param string $login User login
     * @return array<string, mixed> Login response structure
     */
    public static function createLoginResponse(string $accessToken, int $expiresIn, string $login): array
    {
        return [
            'accessToken' => $accessToken,
            'tokenType' => 'Bearer',
            'expiresIn' => $expiresIn,
            'login' => $login,
        ];
    }

    /**
     * Create refresh response structure
     *
     * @param string $accessToken New JWT access token
     * @param int $expiresIn Seconds until token expires
     * @return array<string, mixed> Refresh response structure
     */
    public static function createRefreshResponse(string $accessToken, int $expiresIn): array
    {
        return [
            'accessToken' => $accessToken,
            'tokenType' => 'Bearer',
            'expiresIn' => $expiresIn,
        ];
    }

    /**
     * Create logout response structure
     *
     * @return array<string, mixed> Logout response structure
     */
    public static function createLogoutResponse(): array
    {
        return [
            'message' => 'Successfully logged out',
        ];
    }

    /**
     * Get OpenAPI schemas for authentication responses
     *
     * @return array<string, array<string, mixed>> OpenAPI schema definitions
     */
    public static function getOpenApiSchemas(): array
    {
        return [
            'loginResponse' => [
                'type' => 'object',
                'required' => ['accessToken', 'tokenType', 'expiresIn', 'login'],
                'properties' => [
                    'accessToken' => [
                        'type' => 'string',
                        'description' => 'JWT access token (15 minutes)',
                        'example' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.4X8z...',
                    ],
                    'tokenType' => [
                        'type' => 'string',
                        'enum' => ['Bearer'],
                        'description' => 'Token type for Authorization header',
                        'example' => 'Bearer',
                    ],
                    'expiresIn' => [
                        'type' => 'integer',
                        'description' => 'Seconds until access token expires',
                        'example' => 900,
                    ],
                    'login' => [
                        'type' => 'string',
                        'description' => 'User login name',
                        'example' => 'admin',
                    ],
                ],
                'description' => 'Successful login response with JWT access token. Refresh token is set in httpOnly cookie.',
            ],
            'refreshResponse' => [
                'type' => 'object',
                'required' => ['accessToken', 'tokenType', 'expiresIn'],
                'properties' => [
                    'accessToken' => [
                        'type' => 'string',
                        'description' => 'New JWT access token (15 minutes)',
                        'example' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.4X8z...',
                    ],
                    'tokenType' => [
                        'type' => 'string',
                        'enum' => ['Bearer'],
                        'description' => 'Token type for Authorization header',
                        'example' => 'Bearer',
                    ],
                    'expiresIn' => [
                        'type' => 'integer',
                        'description' => 'Seconds until access token expires',
                        'example' => 900,
                    ],
                ],
                'description' => 'Successful token refresh response. New refresh token may be set in httpOnly cookie if rotation is enabled.',
            ],
            'logoutResponse' => [
                'type' => 'object',
                'required' => ['message'],
                'properties' => [
                    'message' => [
                        'type' => 'string',
                        'description' => 'Logout confirmation message',
                        'example' => 'Successfully logged out',
                    ],
                ],
                'description' => 'Successful logout response. Refresh token cookie is cleared.',
            ],
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
                default => 'string'
            };

            // Add constraints
            if (isset($fieldSchema['minLength'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minLength'];
            }
            if (isset($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['minimum'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minimum'];
            }
            if (isset($fieldSchema['maximum'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maximum'];
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
}

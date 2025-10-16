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

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for authentication API responses
 *
 * Provides OpenAPI schemas for JWT authentication endpoints.
 * Implements OAuth 2.0-like response structure for token management.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Auth
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get detail schema for authentication request parameters
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema defines validation rules for login/refresh/logout endpoints.
     * Used to generate sanitization rules and validate incoming requests.
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];

        $properties = [];

        // ✨ Inherit ALL request parameters (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            $properties[$field] = $definition;
            // Remove sanitization properties (not needed in schema)
            unset($properties[$field]['sanitize']);
        }

        return [
            'type' => 'object',
            'properties' => $properties
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
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     *
     * @return array<string, array<string, mixed>> OpenAPI schema definitions
     */
    public static function getOpenApiSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
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
        return [
            // Request parameters (writable)
            'login' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_login_param',
                'minLength' => 1,
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'admin'
            ],
            'password' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_password',
                'minLength' => 1,
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'MySecurePassword123!'
            ],
            'sessionToken' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_sessionToken',
                'minLength' => 64,
                'maxLength' => 64,
                'pattern' => '^[a-fA-F0-9]{64}$',
                'sanitize' => 'string',
                'example' => 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234'
            ],
            'rememberMe' => [
                'type' => 'boolean',
                'description' => 'rest_schema_auth_rememberMe',
                'default' => false,
                'sanitize' => 'bool',
                'example' => false
            ],
            'refreshToken' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_refreshToken',
                'minLength' => 64,
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => 'encrypted_refresh_token_value'
            ],
            'clientIp' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_clientIp',
                'maxLength' => 45,
                'sanitize' => 'string',
                'example' => '192.168.1.100'
            ],
            'userAgent' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_userAgent',
                'maxLength' => 500,
                'sanitize' => 'string',
                'example' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            ],
            'token' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_token',
                'minLength' => 1,
                'sanitize' => 'string',
                'example' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            ],
            // Response-only fields (readOnly)
            'accessToken' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_accessToken',
                'readOnly' => true,
                'example' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.4X8z...'
            ],
            'tokenType' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_tokenType',
                'enum' => ['Bearer'],
                'readOnly' => true,
                'example' => 'Bearer'
            ],
            'expiresIn' => [
                'type' => 'integer',
                'description' => 'rest_schema_auth_expiresIn',
                'readOnly' => true,
                'example' => 900
            ],
            'message' => [
                'type' => 'string',
                'description' => 'rest_schema_auth_message',
                'readOnly' => true,
                'example' => 'Successfully logged out'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes all authentication parameter definitions and response schemas.
     * Defines parameters for login, refresh, and logout endpoints.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
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
            // Used in API requests (POST /auth:login, POST /auth:refresh, POST /auth:logout)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getDetailSchema() and related schemas
            'response' => $responseOnlyFields,

            // ========== RELATED SCHEMAS ==========
            // Response schemas for login/refresh/logout endpoints
            'related' => [
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
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}

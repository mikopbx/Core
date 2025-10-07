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
     * Get detail schema (not used for Auth - tokens don't have detail views)
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        return [];
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
}

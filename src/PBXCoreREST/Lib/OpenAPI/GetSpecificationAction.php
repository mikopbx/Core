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

namespace MikoPBX\PBXCoreREST\Lib\OpenAPI;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;

/**
 * Get OpenAPI specification action
 *
 * Returns the complete OpenAPI 3.1 specification for MikoPBX REST API
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class GetSpecificationAction
{
    /**
     * List of API controller classes to scan for metadata
     */
    private const API_CONTROLLERS = [
        \MikoPBX\PBXCoreREST\Controllers\ApiKeys\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\AsteriskManagers\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\CallQueues\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\GeneralSettings\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\MailSettings\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\TimeSettings\RestController::class,
        // Add more controllers as they are migrated to attributes
    ];

    /**
     * Get OpenAPI specification
     *
     * @param array<string, mixed> $data Request data containing format parameter
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            $format = $data['format'] ?? 'json';

            // Create metadata registry instance directly
            $registry = new ApiMetadataRegistry();

            // Scan controllers for metadata
            $metadata = $registry->scanControllers(self::API_CONTROLLERS);

            // Generate OpenAPI specification
            $openapi = $registry->generateOpenAPISpec($metadata);

            // Create temporary file with JSON specification for Swagger UI
            $tempFile = sys_get_temp_dir() . '/openapi_spec_' . uniqid() . '.json';
            file_put_contents($tempFile, json_encode($openapi, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            // Use fpassthru to return raw JSON content
            $res->data = [
                'fpassthru' => [
                    'filename' => $tempFile,
                    'need_delete' => true, // Delete temp file after sending
                    'content_type' => 'application/json',
                ]
            ];
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to generate OpenAPI specification: ' . $e->getMessage();
        }

        return $res;
    }
}
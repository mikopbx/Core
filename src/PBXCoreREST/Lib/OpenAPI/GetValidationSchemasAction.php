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
 * Get validation schemas for API endpoints
 *
 * Returns validation schemas extracted from API attributes for request validation
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class GetValidationSchemasAction
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
     * Get validation schemas for API endpoints
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            // Create metadata registry instance directly
            $registry = new ApiMetadataRegistry();

            // Scan controllers and extract validation schemas
            $metadata = $registry->scanControllers(self::API_CONTROLLERS);
            $schemas = $registry->getValidationSchemas($metadata);

            $res->data = $schemas;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to extract validation schemas: ' . $e->getMessage();
        }

        return $res;
    }
}
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

 namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\S3Storage\GetS3SettingsAction;
use MikoPBX\PBXCoreREST\Lib\S3Storage\GetS3StatsAction;
use MikoPBX\PBXCoreREST\Lib\S3Storage\UpdateS3SettingsAction;
use MikoPBX\PBXCoreREST\Lib\S3Storage\TestS3ConnectionAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for S3 Storage management
 *
 * Enum defines all possible operations for S3 storage configuration
 * using type-safe string-backed enum pattern (PHP 8.1+)
 */
enum S3Action: string
{
    /**
     * GET - Retrieve current S3 settings
     * Singleton resource, no ID required
     */
    case GET = 'get';

    /**
     * GET LIST - For singleton resources, returns single record
     * Alias for GET to support consistent API patterns
     */
    case GET_LIST = 'getList';

    /**
     * CREATE - For singleton resources, maps to UPDATE
     * POST on singleton resource without custom method
     * Since there's only one S3 configuration, CREATE = UPDATE
     */
    case CREATE = 'create';

    /**
     * PUT - Completely replace S3 settings
     * All fields must be provided
     */
    case UPDATE = 'update';

    /**
     * PATCH - Partially update S3 settings
     * Only specified fields are updated
     */
    case PATCH = 'patch';

    /**
     * POST - Test S3 connection and credentials
     * Custom action, doesn't modify settings
     */
    case TEST_CONNECTION = 'testConnection';

    /**
     * GET - Get S3 synchronization statistics
     * Returns file counts, sizes, and sync status
     */
    case STATS = 'stats';
}

/**
 * S3 Storage management processor (Singleton resource)
 *
 * Handles all S3 storage management operations as a singleton resource.
 * There's only one S3 storage configuration in the system, so all operations
 * work without resource IDs.
 *
 * RESTful API mapping:
 * - GET /storage/s3              -> get (retrieve current settings)
 * - PUT /storage/s3              -> update (fully replace settings)
 * - PATCH /storage/s3            -> patch (partially update settings)
 * - POST /storage/s3:testConnection -> testConnection (verify connectivity)
 *
 * Design principles:
 * - Singleton pattern: single configuration instance
 * - Enum-based action routing: type-safe operation dispatch
 * - Separate action classes: clean separation of concerns
 * - Encryption handling: automatic secret key encryption
 * - Validation: centralized in DataStructure
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class S3ManagementProcessor extends Injectable
{
    /**
     * Processes S3 storage management requests with type-safe enum matching
     *
     * This is the main entry point for all S3 storage operations. The method:
     * 1. Extracts and validates the action type
     * 2. Extracts request data
     * 3. Matches action to appropriate handler using enum
     * 4. Returns formatted API result
     *
     * Request format:
     * ```php
     * [
     *     'action' => 'get',           // Action enum value (string)
     *     'data' => [                  // Request data (array)
     *         's3_enabled' => 1,
     *         's3_endpoint' => 'https://s3.amazonaws.com',
     *         // ... other fields
     *     ]
     * ]
     * ```
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // ============ STEP 1: EXTRACT ACTION ============
        // Convert action to string, handling both string and numeric inputs
        $actionString = '';
        if (isset($request['action'])) {
            if (is_string($request['action'])) {
                $actionString = $request['action'];
            } elseif (is_numeric($request['action'])) {
                $actionString = (string)$request['action'];
            }
        }

        // ============ STEP 2: EXTRACT DATA ============
        /** @var array<string, mixed> $data */
        $data = isset($request['data']) && is_array($request['data']) ? $request['data'] : [];

        // ============ STEP 3: VALIDATE ACTION ============
        // Convert string to enum case (null if invalid)
        $action = S3Action::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // ============ STEP 4: ROUTE TO HANDLER ============
        // Execute action using type-safe match expression (PHP 8)
        // Each case returns PBXApiResult from corresponding action class
        $res = match ($action) {
            // GET operations (retrieve settings)
            S3Action::GET, S3Action::GET_LIST => GetS3SettingsAction::main($data),

            // CREATE/UPDATE/PATCH operations (modify settings)
            // For singleton resources, CREATE is equivalent to UPDATE
            S3Action::CREATE, S3Action::UPDATE, S3Action::PATCH => UpdateS3SettingsAction::main($data),

            // TEST operation (verify connection)
            S3Action::TEST_CONNECTION => TestS3ConnectionAction::main($data),

            // STATS operation (get synchronization statistics)
            S3Action::STATS => GetS3StatsAction::main(),
        };

        // ============ STEP 5: SET FUNCTION NAME ============
        // Preserve original action name for debugging/logging
        $res->function = $actionString;

        return $res;
    }
}

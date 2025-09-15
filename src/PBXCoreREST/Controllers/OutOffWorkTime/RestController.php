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

namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\OutWorkTimesManagementProcessor;

/**
 * RESTful controller for out-of-work-time management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/out-off-work-time")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all time conditions with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/out-off-work-time?limit=20&offset=0&search=holiday"
 * 
 * # Get specific time condition
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/out-off-work-time/TIME-123
 * 
 * # Create new time condition
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/out-off-work-time \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Holiday schedule","time_from":"09:00","time_to":"18:00"}'
 * 
 * # Full update (replace) time condition
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/out-off-work-time/TIME-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Weekend schedule","weekday_from":"6","weekday_to":"7"}'
 * 
 * # Partial update (modify) time condition
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/out-off-work-time/TIME-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"priority":"10"}'
 * 
 * # Delete time condition
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/out-off-work-time/TIME-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new time condition
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/out-off-work-time:getDefault
 * 
 * # Change priorities for multiple time conditions
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/out-off-work-time:changePriorities \
 *      -H "Content-Type: application/json" \
 *      -d '{"priorities":{"TIME-123":1,"TIME-456":2,"TIME-789":3}}'
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = OutWorkTimesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'copy'],
            'POST' => ['changePriorities']
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        // 'copy' is a resource-level method that requires an ID
        return $method === 'copy' || parent::isResourceLevelMethod($method);
    }
}
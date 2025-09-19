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

namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;

/**
 * RESTful controller for incoming routes management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/incoming-routes")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all incoming routes with optional filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/incoming-routes?limit=20&offset=0&search=office"
 * 
 * # Get specific incoming route
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/incoming-routes/INC-ROUTE-123
 * 
 * # Create new incoming route
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/incoming-routes \
 *      -H "Content-Type: application/json" \
 *      -d '{"number":"1234567890","extension":"100","priority":1}'
 * 
 * # Full update (replace) incoming route
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/incoming-routes/INC-ROUTE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"number":"9876543210","extension":"200","priority":2}'
 * 
 * # Partial update (modify) incoming route
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/incoming-routes/INC-ROUTE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"extension":"300"}'
 * 
 * # Delete incoming route
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/incoming-routes/INC-ROUTE-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new incoming route
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/incoming-routes:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 */
class RestController extends BaseRestController
{
    protected string $processorClass = IncomingRoutesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'getDefaultRoute'],
            'POST' => ['changePriority', 'copy']
        ];
    }
}
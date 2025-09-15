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

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * RESTful controller for outbound routes management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/outbound-routes")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all outbound routes with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/outbound-routes?limit=20&offset=0&search=provider"
 * 
 * # Get specific outbound route
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/outbound-routes/OUT-ROUTE-123
 * 
 * # Create new outbound route
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/outbound-routes \
 *      -H "Content-Type: application/json" \
 *      -d '{"rulename":"International","providerid":"PROV-123","numberbeginswith":"00","restnumbers":"9"}'
 * 
 * # Full update (replace) outbound route
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/outbound-routes/OUT-ROUTE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"rulename":"International Calls","providerid":"PROV-456","numberbeginswith":"00","restnumbers":"10"}'
 * 
 * # Partial update (modify) outbound route
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/outbound-routes/OUT-ROUTE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"priority":"5"}'
 * 
 * # Delete outbound route
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/outbound-routes/OUT-ROUTE-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new outbound route
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/outbound-routes:getDefault
 * 
 * # Copy existing outbound route
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/outbound-routes/123:copy
 * 
 * # Change priority for multiple routes
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/outbound-routes:changePriority \
 *      -H "Content-Type: application/json" \
 *      -d '{"priorities":{"OUT-ROUTE-123":1,"OUT-ROUTE-456":2}}'
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutboundRoutes
 */
class RestController extends BaseRestController
{
    protected string $processorClass = OutboundRoutesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'copy'],
            'POST' => ['changePriority']
        ];
    }
}
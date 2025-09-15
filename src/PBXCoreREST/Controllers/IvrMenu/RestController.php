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

namespace MikoPBX\PBXCoreREST\Controllers\IvrMenu;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\IvrMenuManagementProcessor;

/**
 * RESTful controller for IVR menu management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/ivr-menu")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all IVR menus with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/ivr-menu?limit=20&offset=0&search=main"
 * 
 * # Get specific IVR menu
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/ivr-menu/IVR-123
 * 
 * # Create new IVR menu
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/ivr-menu \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Main Menu","extension":"5000","timeout":"7"}'
 * 
 * # Full update (replace) IVR menu
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/ivr-menu/IVR-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Updated Menu","extension":"5001","timeout":"10"}'
 * 
 * # Partial update (modify) IVR menu
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/ivr-menu/IVR-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"timeout":"15"}'
 * 
 * # Delete IVR menu
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/ivr-menu/IVR-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new IVR menu
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/ivr-menu:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IvrMenu
 */
class RestController extends BaseRestController
{
    protected string $processorClass = IvrMenuManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'copy'],
            'POST' => []
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
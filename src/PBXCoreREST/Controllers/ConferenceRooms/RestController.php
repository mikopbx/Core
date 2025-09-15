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

namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * RESTful controller for conference rooms management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/conference-rooms")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all conference rooms with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/conference-rooms?limit=20&offset=0&search=sales"
 * 
 * # Get specific conference room
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123
 * 
 * # Create new conference room
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/conference-rooms \
 *      -H "Content-Type: application/json" \
 *      -d '{"extension":"3000","name":"Sales Conference","pinCode":"1234"}'
 * 
 * # Full update (replace) conference room
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"extension":"3000","name":"Sales Team Meeting","pinCode":"5678"}'
 * 
 * # Partial update (modify) conference room
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"pinCode":"9999"}'
 * 
 * # Delete conference room
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/conference-rooms/conf-abc123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new conference room
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/conference-rooms:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class RestController extends BaseRestController
{
    protected string $processorClass = ConferenceRoomsManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault']
        ];
    }
}
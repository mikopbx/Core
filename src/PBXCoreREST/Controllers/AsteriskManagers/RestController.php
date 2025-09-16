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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * RESTful controller for Asterisk managers management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/asterisk-managers")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all AMI users with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/asterisk-managers?limit=20&offset=0&search=admin"
 * 
 * # Get specific AMI user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/asterisk-managers/123
 * 
 * # Create new AMI user
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/asterisk-managers \
 *      -H "Content-Type: application/json" \
 *      -d '{"username":"admin","secret":"password123","description":"Admin user"}'
 * 
 * # Full update (replace) AMI user
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/asterisk-managers/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"username":"admin2","secret":"newpass","description":"Updated admin"}'
 * 
 * # Partial update (modify) AMI user
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/asterisk-managers/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"New description"}'
 * 
 * # Delete AMI user
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/asterisk-managers/123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new AMI user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/asterisk-managers:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 */
class RestController extends BaseRestController
{
    protected string $processorClass = AsteriskManagersManagementProcessor::class;
    
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
}
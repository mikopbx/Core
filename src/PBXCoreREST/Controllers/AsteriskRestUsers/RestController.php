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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AsteriskRestUsersManagementProcessor;

/**
 * RESTful controller for Asterisk REST Interface (ARI) users management (v3 API)
 * 
 * Handles CRUD operations for ARI users following REST best practices.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/asterisk-rest-users")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all ARI users
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users?limit=20&offset=0"
 * 
 * # Get specific ARI user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users/123
 * 
 * # Create new ARI user
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users \
 *      -H "Content-Type: application/json" \
 *      -d '{"username":"api_user","password":"SecurePass123","applications":["app1","app2"]}'
 * 
 * # Full update (replace) ARI user
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"username":"api_user","password":"NewPass456","applications":["app1","app3"]}'
 * 
 * # Partial update (modify) ARI user
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"password":"UpdatedPass789"}'
 * 
 * # Delete ARI user
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users/123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new ARI user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users:getDefault
 * 
 * @note For password generation, use the dedicated password API:
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/passwords:generate?length=32
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = AsteriskRestUsersManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault'],
            'POST' => [] // No custom POST methods - use standard CRUD operations
        ];
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\Users;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\UsersManagementProcessor;

/**
 * RESTful controller for users management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/users")
 *
 * @examples Standard CRUD operations:
 *
 * # List all users with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/users?limit=20&offset=0"
 *
 * # Get specific user
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/users/123
 *
 * # Create new user
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/users \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"user@example.com","username":"newuser","password":"secure123"}'
 *
 * # Full update (replace) user
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"updated@example.com","username":"updateduser"}'
 *
 * # Partial update (modify) user
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/users/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"newemail@example.com"}'
 *
 * # Delete user
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/users/123
 *
 * @examples Custom method operations:
 *
 * # Check email availability
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/users:available?email=test@example.com"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Users
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = UsersManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['available'],
            'POST' => []
        ];
    }
}
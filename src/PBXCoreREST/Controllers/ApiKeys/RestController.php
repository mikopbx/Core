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

namespace MikoPBX\PBXCoreREST\Controllers\ApiKeys;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ApiKeysManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{ResourceSecurity, SecurityType, HttpMapping};

/**
 * RESTful controller for API keys management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/api-keys")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all API keys with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/api-keys?limit=20&offset=0"
 * 
 * # Get specific API key
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/api-keys/123
 * 
 * # Create new API key
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/api-keys \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"CRM Integration","full_permissions":false,"allowed_paths":["/api/v3/employees"]}'
 * 
 * # Full update (replace) API key
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/api-keys/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Updated CRM Integration","full_permissions":true}'
 * 
 * # Partial update (modify) API key
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/api-keys/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"New description"}'
 * 
 * # Delete API key
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/api-keys/123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new API key
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/api-keys:getDefault
 * 
 * # Generate new API key
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/api-keys:generateKey
 * 
 * # Get available API controllers/endpoints
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/api-keys:getAvailableControllers
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ApiKeys
 */
#[ResourceSecurity('api_keys', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION])]  // No API_KEY access for API key management
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getAvailableControllers'],
        'POST' => ['create', 'generateKey'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'getAvailableControllers', 'generateKey'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ApiKeysManagementProcessor::class;
    
}
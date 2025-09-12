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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ApiKeysManagementProcessor;

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
class RestController extends BaseController
{
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * Routes handled by this method:
     * @Get("/")                     List all API keys
     * @Get("/{id:[0-9]+}")          Get single API key by ID
     * @Post("/")                    Create new API key
     * @Put("/{id:[0-9]+}")          Full update of API key (replace all fields)
     * @Patch("/{id:[0-9]+}")        Partial update of API key (modify specific fields)
     * @Delete("/{id:[0-9]+}")       Delete API key by ID
     * 
     * @param string|null $id Resource ID for single resource operations
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        // Add ID to request data if provided in URL
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        // Map HTTP method to CRUD action
        $httpMethod = $this->request->getMethod();
        $action = match ($httpMethod) {
            'GET' => $id !== null ? 'getRecord' : 'getList',
            'POST' => 'create',
            'PUT' => 'update',
            'PATCH' => 'patch',
            'DELETE' => 'delete',
            default => null
        };
        
        if ($action === null) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ["Invalid HTTP method: $httpMethod"]]
            ]);
            $this->response->setStatusCode(405, 'Method Not Allowed');
            $this->response->send();
            return;
        }
        
        // Send request to backend worker
        $this->sendRequestToBackendWorker(
            ApiKeysManagementProcessor::class,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests following Google API Design Guide
     * 
     * Routes handled by this method:
     * @Get(":{customMethod:[a-zA-Z]+}")               Collection-level custom methods
     * @Post(":{customMethod:[a-zA-Z]+}")              Collection-level custom methods
     * @Post("/{id:[0-9]+}:{customMethod:[a-zA-Z]+}")  Resource-level custom methods
     * 
     * Supported custom methods:
     * - getDefault: Get default values for new API key (GET)
     * - generateKey: Generate new API key string (POST)
     * - getAvailableControllers: Get list of available API endpoints (GET)
     * 
     * @param string $customMethod The custom method name
     * @param string|null $id Optional resource ID for resource-specific custom methods
     * @return void
     */
    public function handleCustomRequest(string $customMethod, ?string $id = null): void
    {
        // Check HTTP method based on the custom method
        $httpMethod = $this->request->getMethod();
        
        // Define which custom methods are allowed for each HTTP method
        $allowedMethods = [
            'GET' => ['getDefault', 'getAvailableControllers'],
            'POST' => ['generateKey']
        ];
        
        if (!isset($allowedMethods[$httpMethod]) || !in_array($customMethod, $allowedMethods[$httpMethod])) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ["Method '$customMethod' is not allowed with HTTP $httpMethod"]]
            ]);
            $this->response->setStatusCode(405, 'Method Not Allowed');
            $this->response->send();
            return;
        }
        
        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        // Add ID if provided for resource-specific custom methods
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        // Send request to backend worker with custom method as action
        $this->sendRequestToBackendWorker(
            ApiKeysManagementProcessor::class,
            $customMethod,
            $requestData
        );
    }
}
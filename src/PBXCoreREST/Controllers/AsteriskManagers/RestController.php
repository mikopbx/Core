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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
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
class RestController extends BaseController
{
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * Routes handled by this method:
     * @Get("/")                     List all AMI users with optional filtering
     * @Get("/{id:[0-9]+}")          Get single AMI user by ID
     * @Post("/")                    Create new AMI user
     * @Put("/{id:[0-9]+}")          Full update of AMI user (replace all fields)
     * @Patch("/{id:[0-9]+}")        Partial update of AMI user (modify specific fields)
     * @Delete("/{id:[0-9]+}")       Delete AMI user by ID
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
            AsteriskManagersManagementProcessor::class,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests following Google API Design Guide
     * 
     * Routes handled by this method:
     * @Get(":{customMethod:[a-zA-Z]+}")               Collection-level custom methods (getDefault)
     * @Post(":{customMethod:[a-zA-Z]+}")              Collection-level custom methods
     * @Post("/{id:[0-9]+}:{customMethod:[a-zA-Z]+}")  Resource-level custom methods
     * 
     * Supported custom methods:
     * - getDefault: Get default values for new AMI user (GET)
     * 
     * @param string $customMethod The custom method name (e.g., 'getDefault')
     * @param string|null $id Optional resource ID for resource-specific custom methods
     * @return void
     */
    public function handleCustomRequest(string $customMethod, ?string $id = null): void
    {
        // Check HTTP method based on the custom method
        $httpMethod = $this->request->getMethod();
        
        // Define which custom methods are allowed for each HTTP method
        $allowedMethods = [
            'GET' => ['getDefault'],
            'POST' => []
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
            AsteriskManagersManagementProcessor::class,
            $customMethod,
            $requestData
        );
    }
}
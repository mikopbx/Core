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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
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
 * # Generate new password for ARI user
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users/123:generatePassword
 * 
 * # Test ARI connection with user credentials
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/asterisk-rest-users:testConnection \
 *      -H "Content-Type: application/json" \
 *      -d '{"username":"api_user","password":"SecurePass123"}'
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskRestUsers
 */
class RestController extends BaseController
{
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * Routes handled by this method:
     * @Get("/")                     List all ARI users with optional filtering
     * @Get("/{id:[0-9]+}")          Get single ARI user by ID
     * @Post("/")                    Create new ARI user
     * @Put("/{id:[0-9]+}")          Full update of ARI user (replace all fields)
     * @Patch("/{id:[0-9]+}")        Partial update of ARI user (modify specific fields)
     * @Delete("/{id:[0-9]+}")       Delete ARI user by ID
     * 
     * @param string|null $id Resource ID for single resource operations
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        // Add ID to request data if provided in URL
        if ($id !== null) {
            $requestData['id'] = $id;
        }
        
        // Determine action based on HTTP method
        $method = $this->request->getMethod();
        $action = $this->mapHttpMethodToAction($method, $id);
        
        // Log the request for debugging
        $this->logger->info("ARI Users REST request - Method: {$method}, Action: {$action}, ID: " . ($id ?? 'none'));
        
        // Send to backend worker for processing
        $this->sendRequestToBackendWorker(
            AsteriskRestUsersManagementProcessor::class,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests (GET or POST with :customMethod suffix)
     * 
     * Custom methods follow Google API Design Guide patterns for non-CRUD operations.
     * These are called using GET or POST with a colon-prefixed custom method name.
     * 
     * Routes handled by this method:
     * @Get(":getDefaults")                      Get default values for new user
     * @Post("/{id:[0-9]+}:generatePassword")    Generate new password for specific user
     * @Post(":testConnection")                  Test ARI connection with provided credentials
     * @Post(":batchDelete")                     Delete multiple ARI users
     * 
     * @param string $customMethod Custom method name (without colon prefix)
     * @param string|null $id Optional resource ID for resource-specific custom methods
     * @return void
     */
    public function handleCustomMethod(string $customMethod, ?string $id = null): void
    {
        // Check HTTP method based on the custom method
        $httpMethod = $this->request->getMethod();
        
        // Define which custom methods are allowed for each HTTP method
        $allowedMethods = [
            'GET' => ['getDefaults'],
            'POST' => ['generatePassword', 'testConnection', 'batchDelete']
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
        
        // Log the custom method request
        $this->logger->info("ARI Users custom method - Method: {$httpMethod}, Action: {$customMethod}, ID: " . ($id ?? 'none'));
        
        // Send request to backend worker with custom method as action
        $this->sendRequestToBackendWorker(
            AsteriskRestUsersManagementProcessor::class,
            $customMethod,
            $requestData
        );
    }
    
    /**
     * Map HTTP method to processor action
     * 
     * @param string $method HTTP method (GET, POST, PUT, PATCH, DELETE)
     * @param string|null $id Resource ID if present
     * @return string Action name for processor
     */
    private function mapHttpMethodToAction(string $method, ?string $id): string
    {
        return match ($method) {
            'GET' => $id ? 'getRecord' : 'getList',
            'POST' => 'createRecord',
            'PUT' => 'updateRecord',
            'PATCH' => 'patchRecord',
            'DELETE' => 'deleteRecord',
            default => throw new \InvalidArgumentException("Unsupported HTTP method: {$method}")
        };
    }
}
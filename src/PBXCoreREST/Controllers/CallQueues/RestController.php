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

namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * RESTful controller for call queues management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/call-queues")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all call queues with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/call-queues?limit=20&offset=0&search=sales"
 * 
 * # Get specific call queue
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123
 * 
 * # Create new call queue
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/call-queues \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Sales Queue","extension":"800","strategy":"ringall"}'
 * 
 * # Full update (replace) call queue
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Sales Department","extension":"800","strategy":"rrmemory"}'
 * 
 * # Partial update (modify) call queue
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"strategy":"linear"}'
 * 
 * # Delete call queue
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new call queue
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/call-queues:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class RestController extends BaseController
{
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * Routes handled by this method:
     * @Get("/")                     List all call queues with optional filtering
     * @Get("/{id:[a-zA-Z0-9\-]+}")  Get single call queue by ID
     * @Post("/")                    Create new call queue
     * @Put("/{id:[a-zA-Z0-9\-]+}")  Full update of call queue (replace all fields)
     * @Patch("/{id:[a-zA-Z0-9\-]+}") Partial update of call queue (modify specific fields)
     * @Delete("/{id:[a-zA-Z0-9\-]+}") Delete call queue by ID
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
            CallQueuesManagementProcessor::class,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests following Google API Design Guide
     * 
     * Routes handled by this method:
     * @Get(":{customMethod:[a-zA-Z]+}")  Collection-level custom methods (getDefault)
     * 
     * Supported custom methods:
     * - getDefault: Get default values for new call queue (GET)
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
            'POST' => [] // Future expansion: export, import, batchCreate, etc.
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
            CallQueuesManagementProcessor::class,
            $customMethod,
            $requestData
        );
    }
}
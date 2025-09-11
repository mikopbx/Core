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

namespace MikoPBX\PBXCoreREST\Controllers\Employees;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\EmployeesManagementProcessor;

/**
 * RESTful controller for employees management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/employees")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all employees with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/employees?limit=20&offset=0&search=john"
 * 
 * # Get specific employee
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/employees/123
 * 
 * # Create new employee
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/employees \
 *      -H "Content-Type: application/json" \
 *      -d '{"number":"101","user_username":"John Doe","user_email":"john@example.com"}'
 * 
 * # Full update (replace) employee
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/employees/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"number":"101","user_username":"John Smith","user_email":"john.smith@example.com"}'
 * 
 * # Partial update (modify) employee
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/employees/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"user_email":"newemail@example.com"}'
 * 
 * # Delete employee
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/employees/123
 * 
 * @examples Custom method operations:
 * 
 * # Export all employees to CSV
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/employees:export \
 *      -H "Content-Type: application/json" \
 *      -d '{"format":"csv","fields":["number","username","email"]}'
 * 
 * # Import employees from CSV
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/employees:import \
 *      -H "Content-Type: multipart/form-data" \
 *      -F "file=@employees.csv"
 * 
 * # Batch delete multiple employees
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/employees:batchDelete \
 *      -H "Content-Type: application/json" \
 *      -d '{"ids":["123","456","789"]}'
 * 
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Employees
 */
class RestController extends BaseController
{
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * Routes handled by this method:
     * @Get("/")                     List all employees with optional filtering
     * @Get("/{id:[0-9]+}")          Get single employee by ID
     * @Post("/")                    Create new employee
     * @Put("/{id:[0-9]+}")          Full update of employee (replace all fields)
     * @Patch("/{id:[0-9]+}")        Partial update of employee (modify specific fields)
     * @Delete("/{id:[0-9]+}")       Delete employee by ID
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
            EmployeesManagementProcessor::class,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests following Google API Design Guide
     * Custom methods always use POST per Google API Design Guide conventions
     * 
     * Routes handled by this method:
     * @Post(":{customMethod:[a-zA-Z]+}")              Collection-level custom methods
     * @Post("/{id:[0-9]+}:{customMethod:[a-zA-Z]+}")  Resource-level custom methods
     * 
     * Supported custom methods:
     * - export: Export employees to various formats (CSV, JSON, XML)
     * - import: Import employees from file
     * - batchDelete: Delete multiple employees at once
     * 
     * @param string $customMethod The custom method name (e.g., 'export', 'import')
     * @param string|null $id Optional resource ID for resource-specific custom methods
     * @return void
     */
    public function handleCustomRequest(string $customMethod, ?string $id = null): void
    {
        // Custom methods must use POST
        if ($this->request->getMethod() !== 'POST') {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Custom methods must use POST']]
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
            EmployeesManagementProcessor::class,
            $customMethod,
            $requestData
        );
    }
}
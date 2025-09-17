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

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
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
 * # Get default values for new employee
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/employees:getDefault
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
 * @package MikoPBX\PBXCoreREST\Controllers\Employees
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = EmployeesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault'],
            'POST' => ['export', 'exportTemplate', 'import', 'confirmImport', 'batchCreate', 'batchDelete']
        ];
    }
}
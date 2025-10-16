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
use MikoPBX\PBXCoreREST\Lib\Employees\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for employees management (v3 API)
 *
 * Comprehensive employee management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Employees
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/employees',
    tags: ['Employees'],
    description: 'Comprehensive employee management for PBX users. Employees represent staff members with extension numbers, user accounts, and SIP credentials.',
    processor: EmployeesManagementProcessor::class
)]
#[ResourceSecurity('employees', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault'],
        'POST' => ['create', 'export', 'exportTemplate', 'import', 'confirmImport', 'batchCreate', 'batchDelete'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create', 'export', 'exportTemplate', 'import', 'confirmImport', 'batchCreate', 'batchDelete'],
    customMethods: ['getDefault', 'export', 'exportTemplate', 'import', 'confirmImport', 'batchCreate', 'batchDelete'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    protected string $processorClass = EmployeesManagementProcessor::class;


    /**
     * Get list of all employees with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/employees
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_emp_GetList',
        description: 'rest_emp_GetListDesc',
        operationId: 'getEmployeesList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'john')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['number', 'user_username', 'user_email'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific employee by ID
     *
     * @route GET /pbxcore/api/v3/employees/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_emp_GetRecord',
        description: 'rest_emp_GetRecordDesc',
        operationId: 'getEmployeeById'
    )]
    #[ApiParameter('id', 'integer', 'rest_param_id', ParameterLocation::PATH, required: true, example: 1)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new employee
     *
     * @route POST /pbxcore/api/v3/employees
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_emp_Create',
        description: 'rest_emp_CreateDesc',
        operationId: 'createEmployee'
    )]
    #[ApiParameter('number', 'string', 'rest_param_emp_number', ParameterLocation::QUERY, required: true, pattern: '[0-9]{2,8}', example: '101')]
    #[ApiParameter('user_username', 'string', 'rest_param_emp_username', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'John Doe')]
    #[ApiParameter('user_email', 'string', 'rest_param_emp_email', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'john@example.com')]
    #[ApiParameter('mobile_number', 'string', 'rest_param_emp_mobile', ParameterLocation::QUERY, required: false, maxLength: 20, example: '+79001234567')]
    #[ApiParameter('user_avatar', 'string', 'rest_param_emp_avatar', ParameterLocation::QUERY, required: false, maxLength: 255, example: '/path/to/avatar.png')]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing employee (full replacement)
     *
     * @route PUT /pbxcore/api/v3/employees/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_emp_Update',
        description: 'rest_emp_UpdateDesc',
        operationId: 'updateEmployee'
    )]
    #[ApiParameter('id', 'integer', 'rest_param_id', ParameterLocation::PATH, required: true, example: 1)]
    #[ApiParameter('number', 'string', 'rest_param_emp_number', ParameterLocation::QUERY, required: true, pattern: '[0-9]{2,8}', example: '101')]
    #[ApiParameter('user_username', 'string', 'rest_param_emp_username', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'John Smith')]
    #[ApiParameter('user_email', 'string', 'rest_param_emp_email', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'john.smith@example.com')]
    #[ApiParameter('mobile_number', 'string', 'rest_param_emp_mobile', ParameterLocation::QUERY, required: false, maxLength: 20, example: '+79001234567')]
    #[ApiParameter('user_avatar', 'string', 'rest_param_emp_avatar', ParameterLocation::QUERY, required: false, maxLength: 255, example: '/path/to/avatar.png')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing employee
     *
     * @route PATCH /pbxcore/api/v3/employees/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_emp_Patch',
        description: 'rest_emp_PatchDesc',
        operationId: 'patchEmployee'
    )]
    #[ApiParameter('id', 'integer', 'rest_param_id', ParameterLocation::PATH, required: true, example: 1)]
    #[ApiParameter('number', 'string', 'rest_param_emp_number', ParameterLocation::QUERY, required: false, pattern: '[0-9]{2,8}', example: '102')]
    #[ApiParameter('user_username', 'string', 'rest_param_emp_username', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated Name')]
    #[ApiParameter('user_email', 'string', 'rest_param_emp_email', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'newemail@example.com')]
    #[ApiParameter('mobile_number', 'string', 'rest_param_emp_mobile', ParameterLocation::QUERY, required: false, maxLength: 20, example: '+79009999999')]
    #[ApiParameter('user_avatar', 'string', 'rest_param_emp_avatar', ParameterLocation::QUERY, required: false, maxLength: 255, example: '/new/avatar.png')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete an employee
     *
     * @route DELETE /pbxcore/api/v3/employees/{id}
     */
    #[ApiOperation(
        summary: 'rest_emp_Delete',
        description: 'rest_emp_DeleteDesc',
        operationId: 'deleteEmployee'
    )]
    #[ApiParameter('id', 'integer', 'rest_param_id', ParameterLocation::PATH, required: true, example: 1)]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get default template for new employee
     *
     * @route GET /pbxcore/api/v3/employees:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_emp_GetDefault',
        description: 'rest_emp_GetDefaultDesc',
        operationId: 'getEmployeeDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Export employees data
     *
     * @route POST /pbxcore/api/v3/employees:export
     */
    #[ApiOperation(
        summary: 'rest_emp_Export',
        description: 'rest_emp_ExportDesc',
        operationId: 'exportEmployees'
    )]
    #[ApiParameter('format', 'string', 'rest_param_emp_export_format', ParameterLocation::QUERY, required: true, enum: ['csv', 'excel'], example: 'csv')]
    #[ApiParameter('fields', 'array', 'rest_param_emp_export_fields', ParameterLocation::QUERY, required: false, example: '["number","user_username","user_email"]')]
    #[ApiResponse(200, 'rest_response_200_exported')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function export(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get export template
     *
     * @route POST /pbxcore/api/v3/employees:exportTemplate
     */
    #[ApiOperation(
        summary: 'rest_emp_ExportTemplate',
        description: 'rest_emp_ExportTemplateDesc',
        operationId: 'exportEmployeesTemplate'
    )]
    #[ApiResponse(200, 'rest_response_200_exported')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function exportTemplate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Import employees from file
     *
     * @route POST /pbxcore/api/v3/employees:import
     */
    #[ApiOperation(
        summary: 'rest_emp_Import',
        description: 'rest_emp_ImportDesc',
        operationId: 'importEmployees'
    )]
    #[ApiParameter('file', 'string', 'rest_param_emp_import_file', ParameterLocation::QUERY, required: true, example: 'base64_encoded_file_content')]
    #[ApiResponse(200, 'rest_response_200_import_preview')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function import(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Confirm import of employees
     *
     * @route POST /pbxcore/api/v3/employees:confirmImport
     */
    #[ApiOperation(
        summary: 'rest_emp_ConfirmImport',
        description: 'rest_emp_ConfirmImportDesc',
        operationId: 'confirmImportEmployees'
    )]
    #[ApiParameter('data', 'array', 'rest_param_emp_import_data', ParameterLocation::QUERY, required: true, example: '[{"number":"101","user_username":"John"}]')]
    #[ApiResponse(200, 'rest_response_200_imported')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function confirmImport(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Batch create multiple employees
     *
     * @route POST /pbxcore/api/v3/employees:batchCreate
     */
    #[ApiOperation(
        summary: 'rest_emp_BatchCreate',
        description: 'rest_emp_BatchCreateDesc',
        operationId: 'batchCreateEmployees'
    )]
    #[ApiParameter('data', 'array', 'rest_param_emp_batch_data', ParameterLocation::QUERY, required: true, example: '[{"number":"101","user_username":"John"},{"number":"102","user_username":"Jane"}]')]
    #[ApiResponse(200, 'rest_response_200_batch_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchCreate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Batch delete multiple employees
     *
     * @route POST /pbxcore/api/v3/employees:batchDelete
     */
    #[ApiOperation(
        summary: 'rest_emp_BatchDelete',
        description: 'rest_emp_BatchDeleteDesc',
        operationId: 'batchDeleteEmployees'
    )]
    #[ApiParameter('ids', 'array', 'rest_param_emp_batch_ids', ParameterLocation::QUERY, required: true, example: '["1","2","3"]')]
    #[ApiResponse(200, 'rest_response_200_batch_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchDelete(): void
    {
        // Implementation handled by BaseRestController
    }
}

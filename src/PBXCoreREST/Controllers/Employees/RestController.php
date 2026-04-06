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
    tags: ['Employees Management'],
    description: 'rest_Employees_ApiDescription',
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, example: '1')]
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
    #[ApiParameterRef('number', required: true)]
    #[ApiParameterRef('user_username', required: true)]
    #[ApiParameterRef('user_email')]
    #[ApiParameterRef('user_avatar')]
    #[ApiParameterRef('sip_secret', required: true)]
    #[ApiParameterRef('sip_dtmfmode')]
    #[ApiParameterRef('sip_transport')]
    #[ApiParameterRef('sip_manualattributes')]
    #[ApiParameterRef('sip_enableRecording')]
    #[ApiParameterRef('sip_networkfilterid')]
    #[ApiParameterRef('fwd_ringlength')]
    #[ApiParameterRef('fwd_forwarding')]
    #[ApiParameterRef('fwd_forwardingonbusy')]
    #[ApiParameterRef('fwd_forwardingonunavailable')]
    #[ApiParameterRef('mobile_number')]
    #[ApiParameterRef('mobile_dialstring')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, example: '1')]
    #[ApiParameterRef('number', required: true)]
    #[ApiParameterRef('user_username', required: true)]
    #[ApiParameterRef('user_email')]
    #[ApiParameterRef('user_avatar')]
    #[ApiParameterRef('sip_secret', required: true)]
    #[ApiParameterRef('sip_dtmfmode')]
    #[ApiParameterRef('sip_transport')]
    #[ApiParameterRef('sip_manualattributes')]
    #[ApiParameterRef('sip_enableRecording')]
    #[ApiParameterRef('sip_networkfilterid')]
    #[ApiParameterRef('fwd_ringlength')]
    #[ApiParameterRef('fwd_forwarding')]
    #[ApiParameterRef('fwd_forwardingonbusy')]
    #[ApiParameterRef('fwd_forwardingonunavailable')]
    #[ApiParameterRef('mobile_number')]
    #[ApiParameterRef('mobile_dialstring')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, example: '1')]
    #[ApiParameterRef('number')]
    #[ApiParameterRef('user_username')]
    #[ApiParameterRef('user_email')]
    #[ApiParameterRef('user_avatar')]
    #[ApiParameterRef('sip_secret')]
    #[ApiParameterRef('sip_dtmfmode')]
    #[ApiParameterRef('sip_transport')]
    #[ApiParameterRef('sip_manualattributes')]
    #[ApiParameterRef('sip_enableRecording')]
    #[ApiParameterRef('sip_networkfilterid')]
    #[ApiParameterRef('fwd_ringlength')]
    #[ApiParameterRef('fwd_forwarding')]
    #[ApiParameterRef('fwd_forwardingonbusy')]
    #[ApiParameterRef('fwd_forwardingonunavailable')]
    #[ApiParameterRef('mobile_number')]
    #[ApiParameterRef('mobile_dialstring')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, example: '1')]
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
     * Export employees data to CSV file
     *
     * Exports employee data in one of three formats:
     * - minimal: 7 essential fields (number, username, email, mobile, password, ring length, forwarding)
     * - standard: 13 fields (minimal + DTMF, transport, recording, forwarding options)
     * - full: 15 fields (standard + avatar, manual attributes)
     *
     * @route POST /pbxcore/api/v3/employees:export
     */
    #[ApiOperation(
        summary: 'rest_emp_Export',
        description: 'rest_emp_ExportDesc',
        operationId: 'exportEmployees'
    )]
    #[ApiParameterRef('format', required: true)]
    #[ApiParameterRef('filter')]
    #[ApiResponse(200, 'rest_response_200_exported')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function export(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get CSV import template with sample data
     *
     * Returns a CSV file template with sample employee records.
     * Format parameter determines which fields are included:
     * - minimal: 7 essential fields
     * - standard: 13 fields (default)
     * - full: 15 fields including avatar and manual attributes
     *
     * @route POST /pbxcore/api/v3/employees:exportTemplate
     */
    #[ApiOperation(
        summary: 'rest_emp_ExportTemplate',
        description: 'rest_emp_ExportTemplateDesc',
        operationId: 'exportEmployeesTemplate'
    )]
    #[ApiParameterRef('format', required: true)]
    #[ApiResponse(200, 'rest_response_200_exported')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function exportTemplate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Import employees from CSV file
     *
     * Two-phase import process:
     * 1. Preview: validate CSV and show preview of records to be imported
     * 2. Import: execute the import after user confirmation
     *
     * Strategy options:
     * - skip_duplicates: skip existing employees (default)
     * - update_existing: update existing employees with new data
     * - fail_on_duplicate: fail import if duplicate found
     *
     * @route POST /pbxcore/api/v3/employees:import
     */
    #[ApiOperation(
        summary: 'rest_emp_Import',
        description: 'rest_emp_ImportDesc',
        operationId: 'importEmployees'
    )]
    #[ApiParameterRef('upload_id', required: true)]
    #[ApiParameterRef('action', required: true)]
    #[ApiParameterRef('strategy', required: true)]
    #[ApiResponse(200, 'rest_response_200_import_preview')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function import(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Confirm and execute import after preview
     *
     * Executes the actual import operation using the upload_id from the preview phase.
     * This is the second step of the two-phase import process.
     *
     * @route POST /pbxcore/api/v3/employees:confirmImport
     */
    #[ApiOperation(
        summary: 'rest_emp_ConfirmImport',
        description: 'rest_emp_ConfirmImportDesc',
        operationId: 'confirmImportEmployees'
    )]
    #[ApiParameterRef('upload_id', required: true)]
    #[ApiParameterRef('strategy', required: true)]
    #[ApiResponse(200, 'rest_response_200_imported')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function confirmImport(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Batch create multiple employees (max 20 per request)
     *
     * Creates multiple employee records in a single request.
     * Supports two modes:
     * - validate: only validate data without creating
     * - create: validate and create employees (default)
     *
     * Skip_errors option controls error handling:
     * - false: stop at first error (default)
     * - true: continue processing all records
     *
     * @route POST /pbxcore/api/v3/employees:batchCreate
     */
    #[ApiOperation(
        summary: 'rest_emp_BatchCreate',
        description: 'rest_emp_BatchCreateDesc',
        operationId: 'batchCreateEmployees'
    )]
    #[ApiParameterRef('employees', required: true)]
    #[ApiParameterRef('mode')]
    #[ApiParameterRef('skip_errors')]
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
    #[ApiParameterRef('ids', required: true)]
    #[ApiResponse(200, 'rest_response_200_batch_deleted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchDelete(): void
    {
        // Implementation handled by BaseRestController
    }
}

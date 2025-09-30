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

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity,
    ActionType
};

/**
 * RESTful controller for Asterisk managers management (v3 API)
 *
 * Comprehensive Asterisk Manager Interface (AMI) user management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/asterisk-managers',
    tags: ['Asterisk Managers'],
    description: 'Asterisk Manager Interface (AMI) user management for PBX administration. ' .
                'AMI users provide programmatic access to Asterisk for monitoring, control, and integration. ' .
                'Features include permission management, secure authentication, and administrative access controls.',
    processor: AsteriskManagersManagementProcessor::class
)]
#[ResourceSecurity('asterisk_managers', requirements: [SecurityType::LOCALHOST, SecurityType::SESSION, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'copy'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'copy'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = AsteriskManagersManagementProcessor::class;


    /**
     * Get list of all Asterisk managers with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/asterisk-managers
     */
    #[ApiOperation(
        summary: 'Get Asterisk managers list',
        description: 'Retrieve paginated list of Asterisk Manager Interface (AMI) users with optional filtering by username, search term, and sorting options',
        operationId: 'getAsteriskManagersList'
    )]
    #[ApiParameter(
        name: 'limit',
        type: 'integer',
        description: 'Maximum number of records to return',
        in: ParameterLocation::QUERY,
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    )]
    #[ApiParameter(
        name: 'offset',
        type: 'integer',
        description: 'Number of records to skip for pagination',
        in: ParameterLocation::QUERY,
        minimum: 0,
        default: 0,
        example: 0
    )]
    #[ApiParameter(
        name: 'search',
        type: 'string',
        description: 'Search term for filtering by username or description',
        in: ParameterLocation::QUERY,
        maxLength: 255,
        example: 'admin'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'Field to order results by',
        in: ParameterLocation::QUERY,
        enum: ['username', 'description'],
        default: 'username',
        example: 'username'
    )]
    #[ApiParameter(
        name: 'orderWay',
        type: 'string',
        description: 'Sort direction',
        in: ParameterLocation::QUERY,
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'ASC'
    )]
    #[ApiResponse(200, 'List of Asterisk managers retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":[{"id":"53","username":"LocalhostUser","description":"System user for localhost access","represent":"<i class=\"user secret icon\"></i> LocalhostUser","search_index":"localhostuser system user for localhost access"}],"messages":[],"function":"getList","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\GetListAction::main","pid":1408,"meta":{"timestamp":"2025-09-29T12:10:32+03:00","hash":"4cf6b85219952014f2a06b4d77dad1a7f38cd886"}}')]
    #[ApiResponse(400, 'Invalid query parameters', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::READ)]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get specific Asterisk manager by ID
     *
     * @route GET /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiOperation(
        summary: 'Get Asterisk manager',
        description: 'Retrieve detailed information about a specific Asterisk Manager Interface user',
        operationId: 'getAsteriskManager'
    )]
    #[ApiParameter(
        name: 'id',
        type: 'string',
        description: 'Unique identifier of the Asterisk manager',
        in: ParameterLocation::PATH,
        required: true,
        example: '53'
    )]
    #[ApiResponse(200, 'Asterisk manager retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"53","username":"LocalhostUser","secret":"","description":"System user for localhost access","call":"all","cdr":"all","agent":"all","call_timeout":"5","permissions":"system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan,originate","disabled":"0"},"messages":[],"function":"getRecord","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\GetRecordAction::main","pid":1408}')]
    #[ApiResponse(404, 'Asterisk manager not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::READ)]
    public function getRecord(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create new Asterisk manager
     *
     * @route POST /pbxcore/api/v3/asterisk-managers
     */
    #[ApiOperation(
        summary: 'Create Asterisk manager',
        description: 'Create a new Asterisk Manager Interface user with specified permissions and authentication',
        operationId: 'createAsteriskManager'
    )]
    #[ApiParameter('username', 'string', 'AMI username (must be unique)', ParameterLocation::QUERY, required: true, maxLength: 50, example: 'admin')]
    #[ApiParameter('secret', 'string', 'AMI password for authentication', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'securePassword123')]
    #[ApiParameter('description', 'string', 'Description of the AMI user', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Administrator account for monitoring')]
    #[ApiParameter('call', 'string', 'Call control permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('cdr', 'string', 'CDR access permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('agent', 'string', 'Agent permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('call_timeout', 'integer', 'Call timeout in seconds', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 300, default: 5, example: 10)]
    #[ApiParameter('disabled', 'boolean', 'Whether the account is disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiResponse(201, 'Asterisk manager created successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"54","username":"admin","description":"Administrator account"},"messages":["Asterisk manager created successfully"],"function":"create","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\CreateAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid request data or username already exists', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::WRITE)]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update Asterisk manager (full replacement)
     *
     * @route PUT /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiOperation(
        summary: 'Update Asterisk manager',
        description: 'Replace all fields of an existing Asterisk Manager Interface user. All fields will be updated.',
        operationId: 'updateAsteriskManager'
    )]
    #[ApiParameter('id', 'string', 'Unique identifier of the Asterisk manager', ParameterLocation::PATH, required: true, example: '53')]
    #[ApiParameter('username', 'string', 'AMI username (must be unique)', ParameterLocation::QUERY, required: true, maxLength: 50, example: 'admin2')]
    #[ApiParameter('secret', 'string', 'AMI password for authentication', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'newSecurePassword123')]
    #[ApiParameter('description', 'string', 'Description of the AMI user', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated administrator account')]
    #[ApiParameter('call', 'string', 'Call control permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('cdr', 'string', 'CDR access permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('agent', 'string', 'Agent permissions', ParameterLocation::QUERY, required: false, enum: ['all', 'no'], default: 'all', example: 'all')]
    #[ApiParameter('disabled', 'boolean', 'Whether the account is disabled', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiResponse(200, 'Asterisk manager updated successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"53","username":"admin2","description":"Updated administrator account"},"messages":["Asterisk manager updated successfully"],"function":"update","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\UpdateAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(404, 'Asterisk manager not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::WRITE)]
    public function update(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update Asterisk manager
     *
     * @route PATCH /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiOperation(
        summary: 'Patch Asterisk manager',
        description: 'Partially update an Asterisk Manager Interface user. Only provided fields will be modified.',
        operationId: 'patchAsteriskManager'
    )]
    #[ApiParameter('id', 'string', 'Unique identifier of the Asterisk manager', ParameterLocation::PATH, required: true, example: '53')]
    #[ApiParameter('username', 'string', 'AMI username (must be unique)', ParameterLocation::QUERY, required: false, maxLength: 50, example: 'admin_updated')]
    #[ApiParameter('secret', 'string', 'AMI password for authentication', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'updatedPassword123')]
    #[ApiParameter('description', 'string', 'Description of the AMI user', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated description')]
    #[ApiParameter('disabled', 'boolean', 'Whether the account is disabled', ParameterLocation::QUERY, required: false, example: true)]
    #[ApiResponse(200, 'Asterisk manager patched successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"id":"53","username":"admin_updated","description":"Updated description"},"messages":["Asterisk manager updated successfully"],"function":"patch","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\PatchAction::main","pid":1408}')]
    #[ApiResponse(400, 'Invalid request data', 'ErrorResponse')]
    #[ApiResponse(404, 'Asterisk manager not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::WRITE)]
    public function patch(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete Asterisk manager
     *
     * @route DELETE /pbxcore/api/v3/asterisk-managers/{id}
     */
    #[ApiOperation(
        summary: 'Delete Asterisk manager',
        description: 'Permanently delete an Asterisk Manager Interface user. This action cannot be undone.',
        operationId: 'deleteAsteriskManager'
    )]
    #[ApiParameter('id', 'string', 'Unique identifier of the Asterisk manager', ParameterLocation::PATH, required: true, example: '53')]
    #[ApiResponse(200, 'Asterisk manager deleted successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"messages":["Asterisk manager deleted successfully"],"function":"delete","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\DeleteAction::main","pid":1408}')]
    #[ApiResponse(404, 'Asterisk manager not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::WRITE)]
    public function delete(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default values for new Asterisk manager
     *
     * @route GET /pbxcore/api/v3/asterisk-managers:getDefault
     */
    #[ApiOperation(
        summary: 'Get default Asterisk manager values',
        description: 'Retrieve default configuration values for creating a new Asterisk Manager Interface user',
        operationId: 'getAsteriskManagerDefaults'
    )]
    #[ApiResponse(200, 'Default values retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"username":"","secret":"","description":"","call":"all","cdr":"all","agent":"all","call_timeout":"5","permissions":"system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan,originate","disabled":"0"},"messages":[],"function":"getDefault","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\GetDefaultAction::main","pid":1408}')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::READ)]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy existing Asterisk manager
     *
     * @route GET /pbxcore/api/v3/asterisk-managers/{id}:copy
     */
    #[ApiOperation(
        summary: 'Copy Asterisk manager',
        description: 'Create a copy of an existing Asterisk Manager Interface user with modified username',
        operationId: 'copyAsteriskManager'
    )]
    #[ApiParameter('id', 'string', 'Unique identifier of the Asterisk manager to copy', ParameterLocation::PATH, required: true, example: '53')]
    #[ApiResponse(200, 'Asterisk manager template for copying retrieved successfully', example: '{"jsonapi":{"version":"1.0"},"result":true,"data":{"username":"LocalhostUser_copy","secret":"","description":"System user for localhost access (Copy)","call":"all","cdr":"all","agent":"all","call_timeout":"5","permissions":"system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan,originate","disabled":"0"},"messages":[],"function":"copy","processor":"MikoPBX\\\\PBXCoreREST\\\\Lib\\\\AsteriskManagers\\\\CopyAction::main","pid":1408}')]
    #[ApiResponse(404, 'Asterisk manager not found', 'ErrorResponse')]
    #[ApiResponse(401, 'Authentication required', 'ErrorResponse')]
    #[ApiResponse(403, 'Insufficient permissions', 'ErrorResponse')]
    #[ResourceSecurity('asterisk_managers', ActionType::READ)]
    public function copy(): void
    {
        // Implementation handled by BaseRestController
    }
}
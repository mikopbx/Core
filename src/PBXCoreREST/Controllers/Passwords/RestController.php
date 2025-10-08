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

namespace MikoPBX\PBXCoreREST\Controllers\Passwords;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\PasswordsManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for password management (v3 API) - Singleton
 *
 * Password utilities following singleton resource pattern.
 * Implements custom methods for password operations with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Passwords
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/passwords',
    tags: ['Passwords'],
    description: 'Password management utilities for validation and generation. ' .
                'Features include password strength validation, secure password generation, ' .
                'dictionary attack checking, and batch operations for multiple passwords.',
    processor: PasswordsManagementProcessor::class
)]
#[ResourceSecurity('passwords', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['generate'],
        'POST' => ['validate', 'checkDictionary', 'batchValidate', 'batchCheckDictionary']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['generate', 'validate', 'checkDictionary', 'batchValidate', 'batchCheckDictionary'],
    idPattern: null
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = PasswordsManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;


    /**
     * Generate secure password
     *
     * @route GET /pbxcore/api/v3/passwords:generate
     */
    #[ApiOperation(
        summary: 'rest_pwd_Generate',
        description: 'rest_pwd_GenerateDesc',
        operationId: 'generatePassword'
    )]
    #[ApiParameter(
        name: 'length',
        type: 'integer',
        description: 'rest_param_pwd_length',
        in: ParameterLocation::QUERY,
        required: false,
        minimum: 8,
        maximum: 128,
        default: 16,
        example: 16
    )]
    #[ApiParameter(
        name: 'includeSpecial',
        type: 'boolean',
        description: 'rest_param_pwd_includeSpecial',
        in: ParameterLocation::QUERY,
        required: false,
        default: true,
        example: true
    )]
    #[ApiParameter(
        name: 'includeNumbers',
        type: 'boolean',
        description: 'rest_param_pwd_includeNumbers',
        in: ParameterLocation::QUERY,
        required: false,
        default: true,
        example: true
    )]
    #[ApiParameter(
        name: 'includeUppercase',
        type: 'boolean',
        description: 'rest_param_pwd_includeUppercase',
        in: ParameterLocation::QUERY,
        required: false,
        default: true,
        example: true
    )]
    #[ApiParameter(
        name: 'includeLowercase',
        type: 'boolean',
        description: 'rest_param_pwd_includeLowercase',
        in: ParameterLocation::QUERY,
        required: false,
        default: true,
        example: true
    )]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function generate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Validate password strength
     *
     * @route POST /pbxcore/api/v3/passwords:validate
     */
    #[ApiOperation(
        summary: 'rest_pwd_Validate',
        description: 'rest_pwd_ValidateDesc',
        operationId: 'validatePassword'
    )]
    #[ApiParameter(
        name: 'password',
        type: 'string',
        description: 'rest_param_pwd_password',
        in: ParameterLocation::QUERY,
        required: true,
        minLength: 1,
        maxLength: 255,
        example: 'MyStr0ng@Pass2024'
    )]
    #[ApiParameter(
        name: 'field',
        type: 'string',
        description: 'rest_param_pwd_field',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['WebAdminPassword', 'SSHPassword', 'AMIPassword', 'SIPPassword'],
        example: 'WebAdminPassword'
    )]
    #[ApiResponse(200, 'rest_response_200_validated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function validate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check password against dictionary
     *
     * @route POST /pbxcore/api/v3/passwords:checkDictionary
     */
    #[ApiOperation(
        summary: 'rest_pwd_CheckDictionary',
        description: 'rest_pwd_CheckDictionaryDesc',
        operationId: 'checkPasswordDictionary'
    )]
    #[ApiParameter(
        name: 'password',
        type: 'string',
        description: 'rest_param_pwd_password',
        in: ParameterLocation::QUERY,
        required: true,
        minLength: 1,
        maxLength: 255,
        example: 'password123'
    )]
    #[ApiResponse(200, 'rest_response_200_validated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function checkDictionary(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Batch validate multiple passwords
     *
     * @route POST /pbxcore/api/v3/passwords:batchValidate
     */
    #[ApiOperation(
        summary: 'rest_pwd_BatchValidate',
        description: 'rest_pwd_BatchValidateDesc',
        operationId: 'batchValidatePasswords'
    )]
    #[ApiParameter(
        name: 'passwords',
        type: 'array',
        description: 'rest_param_pwd_passwords',
        in: ParameterLocation::QUERY,
        required: true,
        example: '[{"password":"Admin123!","field":"WebAdminPassword"},{"password":"SSH@Pass2024","field":"SSHPassword"}]'
    )]
    #[ApiResponse(200, 'rest_response_200_validated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchValidate(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Batch check multiple passwords against dictionary
     *
     * @route POST /pbxcore/api/v3/passwords:batchCheckDictionary
     */
    #[ApiOperation(
        summary: 'rest_pwd_BatchCheckDictionary',
        description: 'rest_pwd_BatchCheckDictionaryDesc',
        operationId: 'batchCheckPasswordDictionary'
    )]
    #[ApiParameter(
        name: 'passwords',
        type: 'array',
        description: 'rest_param_pwd_passwordsList',
        in: ParameterLocation::QUERY,
        required: true,
        example: '["password1","admin123","MyStr0ng@Pass"]'
    )]
    #[ApiResponse(200, 'rest_response_200_validated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchCheckDictionary(): void
    {
        // Implementation handled by BaseRestController
    }

}

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
use MikoPBX\PBXCoreREST\Lib\Passwords\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    SecurityType,
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
    #[ApiParameterRef('length', required: false)]
    #[ApiParameterRef('includeSpecial', required: false)]
    #[ApiParameterRef('includeNumbers', required: false)]
    #[ApiParameterRef('includeUppercase', required: false)]
    #[ApiParameterRef('includeLowercase', required: false)]
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
    #[ApiParameterRef('password', required: true)]
    #[ApiParameterRef('field', required: false)]
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
    #[ApiParameterRef('password', required: true)]
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
    #[ApiParameterRef('passwords', required: true)]
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
    #[ApiParameterRef('passwordsList', required: true)]
    #[ApiResponse(200, 'rest_response_200_validated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function batchCheckDictionary(): void
    {
        // Implementation handled by BaseRestController
    }

}

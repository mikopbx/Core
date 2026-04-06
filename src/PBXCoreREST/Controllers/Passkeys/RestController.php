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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\Passkeys;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\PasskeysManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Passkeys\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    HttpMapping,
    ResourceSecurity,
    SecurityType
};

/**
 * RESTful controller for WebAuthn passkeys management (v3 API)
 *
 * Comprehensive passkey management following Google API Design Guide patterns.
 * Implements CRUD operations for passkey management and WebAuthn authentication flows.
 * Supports both authenticated (registration/management) and public (authentication) endpoints.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Passkeys
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://www.w3.org/TR/webauthn-2/ - WebAuthn Specification
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/passkeys',    
    tags: ['Passkeys'],
    description: 'rest_Passkeys_ApiDescription',
    processor: PasskeysManagementProcessor::class
)]
#[ResourceSecurity('passkeys', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'checkAvailability', 'authenticationStart'],
        'POST' => ['create', 'registrationStart', 'registrationFinish', 'authenticationFinish'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['checkAvailability', 'authenticationStart', 'registrationStart', 'registrationFinish', 'authenticationFinish'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = PasskeysManagementProcessor::class;

    /**
     * Get list of all passkeys for authenticated user
     *
     * @route GET /pbxcore/api/v3/passkeys
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_pk_GetList',
        description: 'rest_pk_GetListDesc',
        operationId: 'getPasskeysList'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific passkey by ID
     *
     * @route GET /pbxcore/api/v3/passkeys/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_pk_GetRecord',
        description: 'rest_pk_GetRecordDesc',
        operationId: 'getPasskeyById'
    )]
    #[ApiParameterRef('id', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new passkey (alias for registrationStart)
     *
     * @route POST /pbxcore/api/v3/passkeys
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_pk_Create',
        description: 'rest_pk_CreateDesc',
        operationId: 'createPasskey'
    )]
    #[ApiParameterRef('name', required: false)]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update passkey name or metadata
     *
     * @route PATCH /pbxcore/api/v3/passkeys/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_pk_Patch',
        description: 'rest_pk_PatchDesc',
        operationId: 'patchPasskey'
    )]
    #[ApiParameterRef('id', required: true)]
    #[ApiParameterRef('name', required: false)]
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
     * Delete a passkey
     *
     * @route DELETE /pbxcore/api/v3/passkeys/{id}
     */
    #[ApiOperation(
        summary: 'rest_pk_Delete',
        description: 'rest_pk_DeleteDesc',
        operationId: 'deletePasskey'
    )]
    #[ApiParameterRef('id', required: true)]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Check if user has any passkeys registered (PUBLIC - no auth required)
     *
     * @route GET /pbxcore/api/v3/passkeys:checkAvailability
     */
    #[ResourceSecurity('passkeys_check_availability', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_pk_CheckAvailability',
        description: 'rest_pk_CheckAvailabilityDesc',
        operationId: 'checkPasskeyAvailability'
    )]
    #[ApiParameterRef('login', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    public function checkAvailability(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Start WebAuthn registration (authenticated users only)
     *
     * @route POST /pbxcore/api/v3/passkeys:registrationStart
     */
    #[ApiOperation(
        summary: 'rest_pk_RegistrationStart',
        description: 'rest_pk_RegistrationStartDesc',
        operationId: 'startPasskeyRegistration'
    )]
    #[ApiParameterRef('name', required: false)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function registrationStart(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Finish WebAuthn registration (authenticated users only)
     *
     * @route POST /pbxcore/api/v3/passkeys:registrationFinish
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_pk_RegistrationFinish',
        description: 'rest_pk_RegistrationFinishDesc',
        operationId: 'finishPasskeyRegistration'
    )]
    #[ApiParameterRef('credential', required: true)]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function registrationFinish(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Start WebAuthn authentication (PUBLIC - no auth required)
     *
     * @route GET /pbxcore/api/v3/passkeys:authenticationStart
     */
    #[ResourceSecurity('passkeys_authentication_start', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_pk_AuthenticationStart',
        description: 'rest_pk_AuthenticationStartDesc',
        operationId: 'startPasskeyAuthentication'
    )]
    #[ApiParameterRef('login', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function authenticationStart(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Finish WebAuthn authentication (PUBLIC - no auth required)
     *
     * @route POST /pbxcore/api/v3/passkeys:authenticationFinish
     */
    #[ResourceSecurity('passkeys_authentication_finish', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_pk_AuthenticationFinish',
        description: 'rest_pk_AuthenticationFinishDesc',
        operationId: 'finishPasskeyAuthentication'
    )]
    #[ApiParameterRef('credential', required: true)]
    #[ApiResponse(200, 'rest_response_200_auth_login')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_invalid_credentials', 'PBXApiResult')]
    public function authenticationFinish(): void
    {
        // Implementation handled by BaseRestController
    }
}

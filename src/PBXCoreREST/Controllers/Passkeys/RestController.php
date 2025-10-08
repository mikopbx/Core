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
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    HttpMapping,
    ResourceSecurity,
    ActionType,
    SecurityType
};

/**
 * Passkeys REST Controller
 *
 * Handles WebAuthn passkey registration and authentication.
 * Supports both authenticated (registration/management) and public (authentication) endpoints.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Passkeys
 */
#[ApiResource(
    path: '/pbxcore/api/v3/passkeys',
    tags: ['Passkeys', 'Authentication'],
    processor: PasskeysManagementProcessor::class,
    description: 'WebAuthn passkey management and authentication'
)]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'checkAvailability', 'authenticationStart'],
        'POST' => ['registrationStart', 'registrationFinish', 'authenticationFinish'],
        'PATCH' => ['update'],
        'DELETE' => ['delete']
    ],
    customMethods: ['checkAvailability', 'authenticationStart', 'registrationStart', 'registrationFinish', 'authenticationFinish'],
    resourceLevelMethods: []
)]
#[ResourceSecurity(
    'passkeys',
    ActionType::WRITE,
    [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN],
    description: 'Default security for passkey management operations'
)]
class RestController extends BaseRestController
{
    /**
     * @var string Processor class for handling requests
     */
    protected string $processorClass = PasskeysManagementProcessor::class;

    /**
     * Check if user has any passkeys registered (PUBLIC - no auth required)
     * Lightweight check for UI to determine if passkey login should be offered
     *
     * GET /pbxcore/api/v3/passkeys:checkAvailability?login=admin
     */
    #[ResourceSecurity(
        'passkeys_check',
        ActionType::READ,
        [SecurityType::PUBLIC]
    )]
    public function checkAvailability(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Start WebAuthn registration (authenticated users only)
     * Returns publicKeyCredentialCreationOptions for navigator.credentials.create()
     *
     * POST /pbxcore/api/v3/passkeys:registrationStart
     */
    #[ResourceSecurity(
        'passkeys_registration',
        ActionType::WRITE,
        [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN]
    )]
    public function registrationStart(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Finish WebAuthn registration (authenticated users only)
     * Verifies attestation and stores credential
     *
     * POST /pbxcore/api/v3/passkeys:registrationFinish
     */
    #[ResourceSecurity(
        'passkeys_registration',
        ActionType::WRITE,
        [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN]
    )]
    public function registrationFinish(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Start WebAuthn authentication (PUBLIC - no auth required)
     * Returns publicKeyCredentialRequestOptions for navigator.credentials.get()
     *
     * GET /pbxcore/api/v3/passkeys:authenticationStart?login=admin
     */
    #[ResourceSecurity(
        'passkeys_auth',
        ActionType::READ,
        [SecurityType::PUBLIC]
    )]
    public function authenticationStart(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Finish WebAuthn authentication (PUBLIC - no auth required)
     * Verifies assertion and returns session data
     *
     * POST /pbxcore/api/v3/passkeys:authenticationFinish
     */
    #[ResourceSecurity(
        'passkeys_auth',
        ActionType::WRITE,
        [SecurityType::PUBLIC]
    )]
    public function authenticationFinish(): void
    {
        // Implementation handled by BaseRestController
    }
}

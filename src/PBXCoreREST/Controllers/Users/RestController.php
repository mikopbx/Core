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

namespace MikoPBX\PBXCoreREST\Controllers\Users;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\UsersManagementProcessor;
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
 * RESTful controller for users management (v3 API)
 *
 * Provides custom methods for user validation following Google API Design Guide patterns.
 *
 * @RoutePrefix("/pbxcore/api/v3/users")
 *
 * @examples Custom method operations:
 *
 * # Check email availability
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/users:available?email=test@example.com"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Users
 */
#[ApiResource(
    path: '/pbxcore/api/v3/users',
    tags: ['Users'],
    description: 'rest_Users_ApiDescription',
    processor: UsersManagementProcessor::class
)]
#[ResourceSecurity('users', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['available']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['available'],
    customMethods: ['available'],
    idPattern: '[0-9]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = UsersManagementProcessor::class;

    /**
     * Check email availability
     *
     * Checks if a specific email address is available for use.
     * This is useful for validating user input during registration or email updates.
     *
     * @route GET /pbxcore/api/v3/users:available
     */
    #[ApiOperation(
        summary: 'rest_users_Available',
        description: 'rest_users_AvailableDesc',
        operationId: 'checkEmailAvailability'
    )]
    #[ApiParameterRef('email', required: true)]
    #[ApiResponse(200, 'rest_response_200_availability_checked', 'UserAvailability')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function available(): void
    {
        // Implementation handled by BaseRestController
    }
}
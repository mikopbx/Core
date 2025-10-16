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

namespace MikoPBX\PBXCoreREST\Controllers\UserPageTracker;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\UserPageTrackerProcessor;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\DataStructure;
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
 * RESTful controller for user page tracking (v3 API)
 *
 * Tracks user activity on admin interface pages for session management and analytics.
 * This is a custom-methods-only resource without standard CRUD operations.
 *
 * @RoutePrefix("/pbxcore/api/v3/user-page-tracker")
 *
 * @examples Custom method operations:
 *
 * # Record page view
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/user-page-tracker:pageView \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -d '{"pageName":"extensions-index","expire":300}'
 *
 * # Record page leave
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/user-page-tracker:pageLeave \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -d '{"pageName":"extensions-index"}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\UserPageTracker
 */
#[ApiResource(
    path: '/pbxcore/api/v3/user-page-tracker',
    tags: ['User Page Tracker'],
    description: 'User page activity tracking for admin interface. Records page views and departures to track which administrators are currently viewing which pages. Used for session management, activity monitoring, and preventing concurrent editing conflicts.',
    processor: UserPageTrackerProcessor::class
)]
#[ResourceSecurity('user_page_tracker', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'POST' => ['pageView', 'pageLeave']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['pageView', 'pageLeave'],
    customMethods: ['pageView', 'pageLeave']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = UserPageTrackerProcessor::class;

    /**
     * Record a page view event
     *
     * Tracks when a user opens or navigates to a specific page in the admin interface.
     * Updates the user's current page location and sets an expiration time for the session.
     *
     * @route POST /pbxcore/api/v3/user-page-tracker:pageView
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_upt_PageView',
        description: 'rest_upt_PageViewDesc',
        operationId: 'trackPageView'
    )]
    #[ApiParameterRef('pageName', required: true)]
    #[ApiParameterRef('expire', required: false)]
    #[ApiResponse(200, 'rest_response_200_page_tracked')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function pageView(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Record a page leave event
     *
     * Tracks when a user navigates away from or closes a page in the admin interface.
     * Removes the user's current page location from the tracking system.
     *
     * @route POST /pbxcore/api/v3/user-page-tracker:pageLeave
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_upt_PageLeave',
        description: 'rest_upt_PageLeaveDesc',
        operationId: 'trackPageLeave'
    )]
    #[ApiParameterRef('pageName', required: true)]
    #[ApiResponse(200, 'rest_response_200_page_untracked')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function pageLeave(): void
    {
        // Implementation handled by BaseRestController
    }
}

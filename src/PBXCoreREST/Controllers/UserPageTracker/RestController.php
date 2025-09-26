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

/**
 * RESTful controller for user page tracking (v3 API)
 *
 * Handles user page tracking operations following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with custom methods for tracking.
 *
 * @RoutePrefix("/pbxcore/api/v3/user-page-tracker")
 *
 * @examples Custom method operations:
 *
 * # Record page view
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/user-page-tracker:pageView \
 *      -H "Content-Type: application/json" \
 *      -d '{"pageName":"extensions-index","expire":300}'
 *
 * # Record page leave
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/user-page-tracker:pageLeave \
 *      -H "Content-Type: application/json" \
 *      -d '{"pageName":"extensions-index"}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\UserPageTracker
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = UserPageTrackerProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'POST' => ['pageView', 'pageLeave']
        ];
    }

}
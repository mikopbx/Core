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

namespace MikoPBX\PBXCoreREST\Controllers\License;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;

/**
 * RESTful controller for license management (v3 API)
 *
 * License is a singleton resource - there's only one license in the system.
 * This controller implements custom methods for license operations.
 *
 * @RoutePrefix("/pbxcore/api/v3/license")
 *
 * @examples Custom method operations:
 *
 * # Get license information
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/license:getLicenseInfo
 *
 * # Check connection with license server
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/license:ping
 *
 * # Send PBX metrics to license server
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/license:sendPBXMetrics
 *
 * # Reset license key
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/license:resetKey
 *
 * # Process user license request (update key, activate coupon)
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/license:processUserRequest \
 *      -H "Content-Type: application/json" \
 *      -d '{"licKey":"MIKO-XXX-XXX","coupon":"COUPON123"}'
 *
 * # Capture feature for product
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/license:captureFeatureForProductId \
 *      -H "Content-Type: application/json" \
 *      -d '{"productId":"MODULE-ID","featureId":"FEATURE-ID"}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\License
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = LicenseManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['resetKey', 'getLicenseInfo', 'sendPBXMetrics', 'ping'],
            'POST' => ['processUserRequest', 'captureFeatureForProductId']
        ];
    }
}
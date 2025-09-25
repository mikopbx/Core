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

namespace MikoPBX\PBXCoreREST\Controllers\Sip;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SIPStackProcessor;

/**
 * RESTful controller for SIP device status monitoring (v3 API)
 *
 * Handles SIP device monitoring operations following Google API Design Guide patterns.
 * This controller is focused on device monitoring and doesn't provide CRUD operations
 * as SIP devices are managed through Extensions.
 *
 * @RoutePrefix("/pbxcore/api/v3/sip")
 *
 * @examples Collection-level operations:
 * GET    /pbxcore/api/v3/sip:getStatuses        - Get all device statuses
 * POST   /pbxcore/api/v3/sip:forceCheck         - Force check all devices
 * GET    /pbxcore/api/v3/sip:getPeersStatuses   - Get peers statuses (legacy)
 * GET    /pbxcore/api/v3/sip:getRegistry        - Get registry statuses (legacy)
 *
 * @examples Resource-level operations:
 * GET    /pbxcore/api/v3/sip:getStatus/101      - Get status for extension 101
 * POST   /pbxcore/api/v3/sip:forceCheck/101     - Force check extension 101
 * GET    /pbxcore/api/v3/sip:getHistory/101     - Get history for extension 101
 * GET    /pbxcore/api/v3/sip:getStats/101       - Get stats for extension 101
 * GET    /pbxcore/api/v3/sip:getSecret/101      - Get SIP secret for extension 101
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Sip
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     */
    protected string $processorClass = SIPStackProcessor::class;

    /**
     * Handle resource-level custom requests with ID parameter
     * For routes like: /sip/{id}:{method}
     *
     * @param string $id The resource ID
     * @param string $customMethod The custom method name
     * @return void
     */
    public function handleResourceCustomRequest(string $id, string $customMethod): void
    {
        // Call parent with correct parameter mapping
        parent::handleCustomRequest($id, $customMethod);
    }


    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getStatuses', 'getStatus', 'getHistory', 'getStats', 'getPeersStatuses', 'getRegistry', 'getSecret'],
            'POST' => ['forceCheck']
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        $resourceLevelMethods = [
            'getStatus',
            'getHistory',
            'getStats',
            'forceCheck',
            'getSecret'
        ];

        return in_array($method, $resourceLevelMethods, true);
    }

}
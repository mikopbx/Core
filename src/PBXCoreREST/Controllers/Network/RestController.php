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

namespace MikoPBX\PBXCoreREST\Controllers\Network;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\NetworkManagementProcessor;

/**
 * RESTful controller for network configuration management (v3 API)
 *
 * Handles network interfaces and NAT settings configuration following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/network")
 *
 * @examples Standard CRUD operations:
 *
 * # List all network interfaces
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/network
 *
 * # Get specific network interface
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/network/1
 *
 * # Delete network interface
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/network/2
 *
 * @examples Custom method operations:
 *
 * # Get complete network configuration for form
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/network:getConfig
 *
 * # Save complete network configuration
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/network:saveConfig \
 *      -H "Content-Type: application/json" \
 *      -d '{"interfaces":[...],"nat":{...}}'
 *
 * # Get NAT settings
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/network:getNatSettings
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Network
 */
class RestController extends BaseRestController
{
    protected string $processorClass = NetworkManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getConfig', 'getNatSettings'],
            'POST' => ['saveConfig']
        ];
    }
}
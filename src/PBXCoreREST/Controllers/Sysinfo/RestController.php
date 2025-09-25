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

namespace MikoPBX\PBXCoreREST\Controllers\Sysinfo;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SysinfoManagementProcessor;

/**
 * RESTful controller for system information management (v3 API)
 *
 * Sysinfo is a singleton resource - there's only one system in the PBX.
 * This controller implements custom methods for retrieving system information.
 *
 * @RoutePrefix("/pbxcore/api/v3/sysinfo")
 *
 * @examples Custom method operations:
 *
 * # Get complete system information
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sysinfo:getInfo
 *
 * # Get external IP address information
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sysinfo:getExternalIpInfo
 *
 * # Get hypervisor information
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sysinfo:getHypervisorInfo
 *
 * # Get DMI (Desktop Management Interface) information
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sysinfo:getDMIInfo
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Sysinfo
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SysinfoManagementProcessor::class;

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
            'GET' => ['getInfo', 'getExternalIpInfo', 'getHypervisorInfo', 'getDMIInfo'],
            'POST' => []
        ];
    }
}
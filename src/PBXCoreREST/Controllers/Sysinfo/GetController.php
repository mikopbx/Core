<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SysinfoManagementProcessor;

/**
 * Class GetController
 *
 * This controller handles the requests related to system information.
 *
 * @RoutePrefix("/pbxcore/api/sysinfo")
 *
 * @example
 *
 * Gets collection of the system information:
 *   curl http://127.0.0.1/pbxcore/api/sysinfo/getInfo;
 *
 * Gets an external IP address of the system:
 *   curl http://127.0.0.1/pbxcore/api/sysinfo/getExternalIpInfo
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Gets collection of the system information.
     * @Get("/getInfo")
     *
     * Gets an external IP address of the system.
     * @Get("/getExternalIpInfo")
     *
     */
    public function callAction(string $actionName): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);  
        $this->sendRequestToBackendWorker(SysinfoManagementProcessor::class, $actionName, $requestData);
    }
}

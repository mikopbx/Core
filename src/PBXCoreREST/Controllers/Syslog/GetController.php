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

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/syslog/{name} Get system logs (GET)
 *
 * Start logs collection and pickup TCP packages
 *   curl http://172.16.156.212/pbxcore/api/syslog/startLog;
 *
 * Stop tcp dump and start making file for download
 *   curl http://172.16.156.212/pbxcore/api/syslog/stopLog;
 *
 * Gets logs files list
 *   curl http://172.16.156.212/pbxcore/api/syslog/getLogsList;
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker('syslog', $actionName, $_REQUEST);
    }
}
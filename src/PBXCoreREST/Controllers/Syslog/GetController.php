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
use MikoPBX\PBXCoreREST\Lib\SysLogsManagementProcessor;

/**
 * Get system logs (GET)
 *
 * @RoutePrefix("/pbxcore/api/syslog")
 *
 * @examples
 *
 * Starts the collection of logs and captures TCP packets.
 *   curl http://172.16.156.212/pbxcore/api/syslog/startLog;
 *
 * Stops tcpdump and starts creating a log files archive for download.
 *   curl http://172.16.156.212/pbxcore/api/syslog/stopLog;
 *
 * Returns list of log files to show them on web interface
 *   curl http://172.16.156.212/pbxcore/api/syslog/getLogsList;
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Starts the collection of logs and captures TCP packets.
     * @Get("/startLog")
     *
     * Stops tcpdump and starts creating a log files archive for download.
     * @Get("/stopLog")
     *
     * Starts creating a log files archive for download.
     * @Get("/prepareLog")
     *
     * Returns list of log files to show them on web interface
     * @Get("/getLogsList")
     *
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(SysLogsManagementProcessor::class, $actionName, $_REQUEST);
    }
}
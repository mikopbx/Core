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

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;

/**
 * System management (GET)
 *
 * @RoutePrefix("/pbxcore/api/system")
 *
 * @examples
 * Shutdown the system.
 *   curl http://127.0.0.1/pbxcore/api/system/shutdown;
 *
 * Reboot the operating system.
 *   curl http://127.0.0.1/pbxcore/api/system/reboot;
 *
 * Ping backend (described in nginx.conf):
 *   curl http://127.0.0.1/pbxcore/api/system/ping
 *
 * Retrieves the system date and time:
 *   curl http://127.0.0.1/pbxcore/api/system/getDate
 *
 * Restore default system settings
 *   curl http://127.0.0.1/pbxcore/api/system/restoreDefault
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Ping backend (described in nginx.conf)
     * @Get("/ping")
     *
     * Reboot the operating system.
     * @Get("/reboot")
     *
     * Shutdown the system.
     * @Get("/shutdown")
     *
     * Retrieves the system date and time.
     * @Get("/getDate")
     *
     * Tries to send a test email.
     * @Get("/updateMailSettings")
     *
     * Restore default system settings
     * @Get("/restoreDefault")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(SystemManagementProcessor::class, $actionName, $_REQUEST);
    }
}
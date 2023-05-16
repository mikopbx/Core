<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * /pbxcore/api/system/{name} System management (GET)
 *
 * Shutdown system
 *   curl http://127.0.0.1/pbxcore/api/system/shutdown;
 *
 * Reboot system
 *   curl http://127.0.0.1/pbxcore/api/system/reboot;
 *
 * Get list of banned IP by fail2ban
 *   curl http://127.0.0.1/pbxcore/api/system/getBanIp;
 *
 * Ping backend (described in nginx.conf):
 *   curl http://127.0.0.1/pbxcore/api/system/ping
 *
 * Get system date:
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
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker('system', $actionName, $_REQUEST);
    }
}
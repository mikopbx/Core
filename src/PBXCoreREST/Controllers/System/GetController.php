<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
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
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('system', $actionName, $_REQUEST);
    }
}
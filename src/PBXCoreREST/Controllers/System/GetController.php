<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /pbxcore/api/system/{name} System management (GET)
 *
 * Shutdown system
 *   curl http://172.16.156.212/pbxcore/api/system/shutdown;
 *
 * Reboot system
 *   curl http://172.16.156.212/pbxcore/api/system/reboot;
 *
 * Get list of banned IP by fail2ban
 *   curl http://172.16.156.212/pbxcore/api/system/getBanIp;
 *
 * Reload smtp notification service
 *   curl http://172.16.156.212/pbxcore/api/system/reloadMsmtp;
 *
 * Ping backend (described in nginx.conf):
 *   curl http://172.16.156.223/pbxcore/api/system/ping
 *
 * Get system date:
 *   curl http://172.16.156.223/pbxcore/api/system/getDate
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('system', $actionName, $_REQUEST);
    }
}
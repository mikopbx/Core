<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

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
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('syslog', $actionName, $_REQUEST);
    }
}
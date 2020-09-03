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
 * /pbxcore/api/system/{name} Управление системой в целом (GET)
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/shutdown;
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/reboot;
 * Получения забаненных ip
 *   curl http://172.16.156.212/pbxcore/api/system/getBanIp;
 * Получение информации о системе
 *   curl http://172.16.156.223/pbxcore/api/system/getInfo;
 * Настройка msmtp
 *   curl http://172.16.156.212/pbxcore/api/system/reloadMsmtp;
 *
 * Пинг АТС (описан в nginx.conf):
 *   curl http://172.16.156.223/pbxcore/api/system/ping
 *
 * Получение информации о внешнем IP адресе:
 *   curl http://172.16.156.212/pbxcore/api/system/getExternalIpInfo
 *
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('storage', $actionName, $_REQUEST);
    }
}
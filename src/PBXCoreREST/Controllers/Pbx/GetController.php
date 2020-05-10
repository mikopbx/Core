<?php

namespace MikoPBX\PBXCoreREST\Controllers\Pbx;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/pbx/{name} Управление PBX
 * Проверка лицензии
 *   curl http://172.16.156.212/pbxcore/api/pbx/check_licence;
 *
 * Пример ответа:
 *   {"result":"Success"}
 */
class GetController extends BaseController
{

    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('pbx', $actionName);
    }
}
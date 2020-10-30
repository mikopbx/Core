<?php

namespace MikoPBX\PBXCoreREST\Controllers\Iax;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * Статусы регистраций: '/api/iax/{name}'
 *   curl http://172.16.156.212/pbxcore/api/iax/getRegistry;
 */
class GetController extends BaseController
{

    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('iax', $actionName);
    }
}
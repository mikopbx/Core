<?php

namespace MikoPBX\PBXCoreREST\Controllers\Storage;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /api/storage/{name}
 * Получить список подключенных дисков к ПК.
 * curl http://172.16.156.212/pbxcore/api/storage/list
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('storage', $actionName, $_REQUEST);
    }
}
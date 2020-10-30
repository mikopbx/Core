<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Sysinfo;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/sysinfo/{name}' Get system logs (POST).
 *
 *
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $data = $this->request->getPost();
        $this->sendRequestToBackendWorker('sysinfo', $actionName, $data);
    }

}
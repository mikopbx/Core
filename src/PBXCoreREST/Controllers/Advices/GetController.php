<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Advices;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

class GetController extends BaseController
{
    /**
     * Get advices and notifications /pbxcore/api/advices/
     *
     * Makes the list of notifications about system, firewall, passwords, wrong settings
     * curl http://127.0.0.1/pbxcore/api/advices/getList;
     *
     *
     * @param $actionName
     */
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('advices', $actionName, [],'', 10, 2048);
    }
}
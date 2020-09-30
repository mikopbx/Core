<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\License;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

class GetController extends BaseController
{
    /**
     *
     * @param $actionName
     */
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('license', $actionName);
    }
}
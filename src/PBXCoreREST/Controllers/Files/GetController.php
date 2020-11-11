<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\Files;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/files/{name} Files management (GET)
 *
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('files', $actionName, $_REQUEST);
    }
}
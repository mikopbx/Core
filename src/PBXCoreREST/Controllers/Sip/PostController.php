<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Sip;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * '/api/sip/{name}'
 * Получение информации по SIP пиру
 *   curl -X POST -d '{"peer": "212"}' http://127.0.0.1/pbxcore/api/sip/getSipPeer;
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $raw_data = $this->request->getRawBody();
        $data     = json_decode($raw_data, true);
        $this->sendRequestToBackendWorker('sip', $actionName, $data);
    }
}
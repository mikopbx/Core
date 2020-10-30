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

class GetController extends BaseController
{
    /**
     * /pbxcore/api/sip/ Получение информации о SIP '/api/sip/{name}'
     * Статусы SIP учеток:
     *   curl http://172.16.156.223/pbxcore/api/sip/getPeersStatuses;
     * Пример ответа:
     *   {"result":"Success","data":[{"id":"204","state":"UNKNOWN"}]}
     *
     * Статусы регистраций:
     *   curl http://172.16.156.212/pbxcore/api/sip/getRegistry;
     * Пример ответа:
     *   {"result":"Success","data":[{"id":"SIP-PROVIDER-426304427564469b6c7755","state":"Registered"}]}
     *
     * @param $actionName
     */
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('sip', $actionName);
    }
}
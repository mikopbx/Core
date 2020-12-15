<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
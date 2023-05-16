<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * Controller for handling SIP-related actions.
 *
 * @example
 * /pbxcore/api/sip/ Get information about SIP '/api/sip/{name}'
 * SIP account statuses:
 * curl http://127.0.0.1/pbxcore/api/sip/getPeersStatuses;
 *
 * Example response:
 * {"result":"Success","data":[{"id":"204","state":"UNKNOWN"}]}
 *
 * Registration statuses:
 * curl http://127.0.0.1/pbxcore/api/sip/getRegistry;
 *
 * Example response:
 * {"result":"Success","data":[{"id":"SIP-PROVIDER-426304427564469b6c7755","state":"Registered"}]}
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call action for SIP.
     *
     * @param string $actionName The name of the action.
     * @return void
     *
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker('sip', $actionName);
    }
}
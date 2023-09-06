<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\PBXCoreREST\Lib\SIPStackProcessor;

/**
 * Controller for handling SIP-related actions using POST requests.
 *
 * @RoutePrefix("/pbxcore/api/sip")
 *
 * @example
 *
 * Retrieves the status of provided SIP peer.
 * curl -X POST -d '{"peer": "212"}' http://127.0.0.1/pbxcore/api/sip/getSipPeer;
 */
class PostController extends BaseController
{
    /**
     * Handles the call action for SIP using POST requests.
     *
     * Retrieves the status of provided SIP peer.
     * @Post("/getSipPeer")
     *
     * @param string $actionName The name of the action.
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $raw_data = $this->request->getRawBody();
        $data     = json_decode($raw_data, true);
        $this->sendRequestToBackendWorker(SIPStackProcessor::class, $actionName, $data);
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ExtensionsManagementProcessor;

/**
 * Handles the GET request for extensions data.
 *
 * @RoutePrefix("/pbxcore/api/extensions")
 *
 * @examples
 * curl http://127.0.0.1/pbxcore/api/extensions/getForSelect?type=all;
 * curl http://127.0.0.1/pbxcore/api/extensions/available?number=225;
 * curl http://127.0.0.1/pbxcore/api/extensions/getPhoneRepresent?number=225;
 * curl http://127.0.0.1/pbxcore/api/extensions/getRecord?id=195
 */
class GetController extends BaseController
{

    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action.
     *
     * Get data structure for saveRecord request, if id parameter is empty it returns structure with default data
     * @Get("/getRecord")
     *
     * Retrieves the extensions list limited by type parameter.
     * @Get("/getForSelect")
     *
     * Checks the number uniqueness.
     * @Get("/available")
     *
     * Returns CallerID names for the number.
     * @Get("/getPhoneRepresent")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $requestData = $this->request->get();
        $this->sendRequestToBackendWorker(ExtensionsManagementProcessor::class, $actionName, $requestData);
    }

}
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

namespace MikoPBX\PBXCoreREST\Controllers\Users;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\UsersManagementProcessor;

/**
 * Handles the GET request for users data.
 *
 * @RoutePrefix("/pbxcore/api/users")
 *
 * @examples
 * curl http://127.0.0.1/pbxcore/api/users/available?email=support@mikopbx.com;
 */
class GetController extends BaseController
{

    /**
     * Calls the corresponding action for Users database requests based on the provided $actionName.
     *
     * @param string $actionName The name of the action.
     *
     * Checks the email uniqueness.
     * @Get("/available")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $requestData = $this->request->get();
        $this->sendRequestToBackendWorker(UsersManagementProcessor::class, $actionName, $requestData);
    }

}
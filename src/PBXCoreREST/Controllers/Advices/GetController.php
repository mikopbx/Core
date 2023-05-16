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

namespace MikoPBX\PBXCoreREST\Controllers\Advices;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * Controller for handling advices and notifications related actions.
 *
 * @example
 *
 * curl http://127.0.0.1/pbxcore/api/advices/getList;
 *
 */
class GetController extends BaseController
{
    /**
     * Retrieves advices and notifications from /pbxcore/api/advices/
     *
     * This method retrieves the list of notifications regarding the system, firewall, passwords, and wrong settings.
     * The following command can be used to invoke this action:
     *
     * @param string $actionName The name of the action.
     * @return void
     *
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker('advices', $actionName, [],'', 10, 2048);
    }
}
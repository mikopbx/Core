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

namespace MikoPBX\PBXCoreREST\Controllers\Advice;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AdviceProcessor;

/**
 * Controller for handling advice and notifications related actions.
 *
 * @RoutePrefix("/pbxcore/api/advice")
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Advice
 *
 * @example
 *
 * curl http://127.0.0.1/pbxcore/api/advice/getList;
 *
 */
class GetController extends BaseController
{
    /**
     * This method retrieves the list of notifications regarding the system, firewall, passwords, and wrong settings.
     * The following command can be used to invoke this action:
     *
     * @param string $actionName The name of the action.
     *
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     * @Get("/getList")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(AdviceProcessor::class, $actionName, [],'', 10, 2048);
    }
}
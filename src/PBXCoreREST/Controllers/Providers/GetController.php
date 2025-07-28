<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * Providers GET requests controller
 *
 * @RoutePrefix("/pbxcore/api/providers")
 */
class GetController extends BaseController
{
    /**
     * Calls the action handler based on the provided REST API action name
     *
     * @param string $actionName The name of the REST API action.
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(ProvidersManagementProcessor::class, $actionName, $_REQUEST);
    }
}
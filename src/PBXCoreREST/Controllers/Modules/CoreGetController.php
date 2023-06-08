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

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;

/**
 * Handles the GET request for module manipulation actions.
 *
 * @RoutePrefix("/pbxcore/api/modules/core")
 */
class CoreGetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name for core
     *
     * @param string $actionName The name of the action
     *
     * Retrieves available modules on MIKO repository.
     * @Post("/getAvailableModules")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(ModulesManagementProcessor::class, $actionName);
    }
}

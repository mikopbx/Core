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
 * Handles the POST request for module manipulation actions.
 *
 * @RoutePrefix("/pbxcore/api/modules/core")
 */
class CorePostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name for core
     *
     * @param string $actionName The name of the action
     *
     * Starts the module download in a separate background process.
     * @Post("/moduleStartDownload")
     *
     * Returns the download status of a module.
     * @Post("/moduleDownloadStatus")
     *
     * Installs a new additional extension module from an early uploaded zip archive.
     * @Post("/installNewModule")
     *
     * Checks the status of a module installation by the provided zip file path.
     * @Post("/statusOfModuleInstallation")
     *
     * Enables an extension module.
     * @Post("/enableModule")
     *
     * Disables an extension module.
     * @Post("/disableModule")
     *
     * Uninstall an extension module.
     * @Post("/uninstallModule")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $data = $this->request->getPost();
        $this->sendRequestToBackendWorker(ModulesManagementProcessor::class, $actionName, $data);
    }
}

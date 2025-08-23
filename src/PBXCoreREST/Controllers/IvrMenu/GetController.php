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

namespace MikoPBX\PBXCoreREST\Controllers\IvrMenu;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\IvrMenuManagementProcessor;

/**
 * GET controller for IVR menu management
 * 
 * @RoutePrefix("/pbxcore/api/v2/ivr-menu")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/ivr-menu/getRecord/IVR-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/ivr-menu/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/ivr-menu/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IvrMenu
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get IVR menu record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all IVR menus
     * @Get("/getList")
     * 
     * @param string $actionName
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        if (!empty($id)){
            $requestData['id'] = $id;
        }
        
        // Send request to Worker
        $this->sendRequestToBackendWorker(
            IvrMenuManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}

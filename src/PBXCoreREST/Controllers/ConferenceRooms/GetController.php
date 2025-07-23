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

namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * GET controller for conference rooms management
 * 
 * @RoutePrefix("/pbxcore/api/v2/conference-rooms")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getRecord/CONFERENCE-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get conference room record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all conference rooms
     * @Get("/getList")
     * 
     * @param string $actionName
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)){
            $requestData['id'] = $id;
        }
        
        // Send request to Worker
        $this->sendRequestToBackendWorker(
            ConferenceRoomsManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
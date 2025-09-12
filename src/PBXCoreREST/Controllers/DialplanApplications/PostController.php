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

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * POST controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 */
class PostController extends BaseController
{
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates dialplan application record
     * @Post("/saveRecord")
     * 
     * Deletes the dialplan applications record with its dependent tables
     * @Post("/deleteRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            DialplanApplicationsManagementProcessor::class,
            $actionName,
            $requestData
        );
    }
}
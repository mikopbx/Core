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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ExtensionsManagementProcessor;

/**
 * GET controller for extensions management
 * 
 * @RoutePrefix("/pbxcore/api/v2/extensions")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getList
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getForSelect?type=all
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/available?number=101
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getStatuses
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getStatus/101
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getHistory/101?limit=50
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/getStats/101?days=7
 * curl http://127.0.0.1/pbxcore/api/v2/extensions/forceCheck/101
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Extensions
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * 
     * Get extensions for dropdown/select components
     * @Get("/getForSelect")
     * 
     * Check if extension number is available
     * @Get("/available")
     * 
     * Get phone representation
     * @Get("/getPhoneRepresent")
     * 
     * Get phones representations (multiple)
     * @Get("/getPhonesRepresent")
     * 
     * Get all extension statuses
     * @Get("/getStatuses")
     * 
     * Get status for specific extension
     * @Get("/getStatus/{extension}")
     * 
     * Get history for specific extension
     * @Get("/getHistory/{extension}")
     * 
     * Get statistics for specific extension
     * @Get("/getStats/{extension}")
     * 
     * Force status check for specific extension or all
     * @Get("/forceCheck")
     * @Get("/forceCheck/{extension}")
     * 
     * @param string $actionName
     * @param string|null $id Optional ID parameter for record operations or extension number
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        if (!empty($id)){
            // For status/history/stats actions, use 'extension' parameter
            if (in_array($actionName, ['getStatus', 'getHistory', 'getStats', 'forceCheck'])) {
                $requestData['extension'] = $id;
            } else {
                $requestData['id'] = $id;
            }
        }
        
        // Send request to Worker
        $this->sendRequestToBackendWorker(
            ExtensionsManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}

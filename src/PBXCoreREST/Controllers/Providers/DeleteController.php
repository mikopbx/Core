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
 * DELETE controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 */
class DeleteController extends BaseController
{
    
    /**
     * Handle the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $typeOrId Type or ID parameter (for backward compatibility)
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Delete a provider record
     * @Delete("/deleteRecord/{type}/{id}") or @Delete("/deleteRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $typeOrId = null, ?string $id = null): void
    {
        $requestData = [];
        
        // Handle both formats: /deleteRecord/{type}/{id} and /deleteRecord/{id}
        if ($id !== null) {
            // Format: /deleteRecord/{type}/{id}
            $requestData['type'] = $typeOrId;
            $requestData['id'] = $id;
        } elseif ($typeOrId !== null) {
            // Format: /deleteRecord/{id} (backward compatibility)
            $requestData['id'] = $typeOrId;
        }
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
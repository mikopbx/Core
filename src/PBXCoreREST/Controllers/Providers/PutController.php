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
 * PUT controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 */
class PutController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $typeOrId Type or ID parameter (for backward compatibility)
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Update an existing provider record
     * @Put("/saveRecord/{type}/{id}") or @Put("/saveRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $typeOrId = null, ?string $id = null): void
    {
        // Use unified method to get request data (handles both JSON and form data)
        $putData = $this->request->getData();
        
        // Handle both formats: /saveRecord/{type}/{id} and /saveRecord/{id}
        if ($id !== null) {
            // Format: /saveRecord/{type}/{id}
            $putData['type'] = $typeOrId;
            $putData['id'] = $id;
        } elseif ($typeOrId !== null) {
            // Format: /saveRecord/{id} (backward compatibility)
            $putData['id'] = $typeOrId;
        }
        
        // Sanitize input data
        $sanitizedData = self::sanitizeData($putData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class, 
            $actionName, 
            $sanitizedData
        );
    }
}
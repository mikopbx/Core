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
 * POST controller for providers management
 * 
 * @RoutePrefix("/pbxcore/api/v2/providers")
 */
class PostController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * 
     * Create a new provider record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
         // Handle both form data and JSON data
         $requestData = $this->request->getData();    
        
         // For extensions, we need to handle password and manual attributes fields specially
         // Don't sanitize fields through the filter
         $protectedFields = ['manualattributes', 'secret'];
         $protectedData = [];
         
         foreach ($protectedFields as $field) {
             if (isset($requestData[$field])) {
                 $protectedData[$field] = $requestData[$field];
                 unset($requestData[$field]);
             }
         }
         
         // Sanitize other data
         $requestData = self::sanitizeData($requestData, $this->filter);
         
         // Restore protected fields
         foreach ($protectedData as $field => $value) {
             $requestData[$field] = $value;
         }
        
        $this->sendRequestToBackendWorker(
            ProvidersManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
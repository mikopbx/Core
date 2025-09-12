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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\GeneralSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\GeneralSettingsProcessor;

/**
 * POST controller for general settings management
 * 
 * @RoutePrefix("/pbxcore/api/v2/general-settings")
 */
class PostController extends BaseController
{
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Saves multiple general settings with validation and password synchronization
     * @Post("/saveSettings")
     * 
     * Saves single setting by key
     * @Post("/saveRecord") 
     * 
     * Updates codec priorities and status
     * @Post("/updateCodecs")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Handle both form data and JSON data
        $requestData = $this->request->getData();    
        
        // For general settings, we need to handle password fields specially
        // Don't sanitize password fields through the filter
        $protectedFields = [PbxSettings::SSH_PASSWORD, PbxSettings::WEB_ADMIN_PASSWORD];
        $protectedData = [];
        
        foreach ($protectedFields as $field) {
            if (isset($requestData[$field])) {
                $protectedData[$field] = $requestData[$field];
                unset($requestData[$field]);
            }
        }
        
        // Sanitize other data
        $requestData = self::sanitizeData($requestData, $this->filter);
        
        // Restore protected password fields
        foreach ($protectedData as $field => $value) {
            $requestData[$field] = $value;
        }
        
        $this->sendRequestToBackendWorker(
            GeneralSettingsProcessor::class,
            $actionName,
            $requestData
        );
    }
}
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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\GeneralSettingsProcessor;

/**
 * GET controller for general settings management
 * 
 * @RoutePrefix("/pbxcore/api/v2/general-settings")
 */
class GetController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $key Optional key parameter for single record operations
     * 
     * Get all general settings as flat key-value pairs
     * @Get("/getSettings")
     * 
     * Get single setting value by key
     * @Get("/getRecord/{key}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $key = null): void
    {
        // Use unified method to get request data (handles both JSON and form data)
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        if (!empty($key)) {
            $requestData['key'] = $key;
        }
        
        $this->sendRequestToBackendWorker(
            GeneralSettingsProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
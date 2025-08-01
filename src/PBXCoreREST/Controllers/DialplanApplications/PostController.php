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
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
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
        // Handle both form data and JSON data
        $postData = [];
        
        if ($this->request->getContentType() === 'application/json') {
            // Handle JSON requests
            $rawBody = $this->request->getRawBody();
            if (!empty($rawBody)) {
                $jsonData = json_decode($rawBody, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                    $postData = $jsonData;
                }
            }
        } else {
            // Handle form data
            $postData = $this->request->getPost();
        }
        
        // Sanitize the data
        $postData = self::sanitizeData($postData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            DialplanApplicationsManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
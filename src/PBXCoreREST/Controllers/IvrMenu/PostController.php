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
 * POST controller for IVR menu management
 * 
 * @RoutePrefix("/pbxcore/api/v2/ivr-menu")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/ivr-menu/saveRecord \
 *   -d "name=Main Menu&extension=2001&timeout=10"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IvrMenu
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates IVR menu record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Handle both JSON and form data
        $contentType = $this->request->getContentType();
        
        if (strpos($contentType, 'application/json') !== false) {
            // Handle JSON data
            $rawBody = $this->request->getRawBody();
            $postData = json_decode($rawBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->response->setStatusCode(400, 'Bad Request');
                $this->response->setJsonContent([
                    'result' => false,
                    'messages' => ['error' => ['Invalid JSON format']]
                ]);
                return;
            }
        } else {
            // Handle form data
            $postData = $this->request->getPost();
        }
        
        $postData = self::sanitizeData($postData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            IvrMenuManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}

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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;


use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ExtensionsManagementProcessor;
use Phalcon\Filter\Filter;

/**
 * Handles the POST requests for extensions data.
 *
 * @RoutePrefix("/pbxcore/api/extensions")
 *
 * @examples
 *
 * Get phones represent
 *   curl -X POST -d '{"numbers": [225,224,79265244744,6681423434]}' http://127.0.0.1/pbxcore/api/extensions/getPhonesRepresent;
 *
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Returns CallerID names for the numbers list.
     * @Post("/getPhonesRepresent")
     *
     * Saves extensions, sip, users, external phones, forwarding rights with POST data
     * @Post("/saveRecord")
     *
     * Deletes the extension record with its dependent tables.
     * @Post("/deleteRecord")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        
        // Handle both form data and JSON data
        $requestData = $this->request->getData();    
        
        // For extensions, we need to handle password and manual attributes fields specially
        // Don't sanitize fields through the filter
        $protectedFields = ['sip_manualattributes', 'sip_secret'];
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

        $this->sendRequestToBackendWorker(ExtensionsManagementProcessor::class, $actionName, $requestData);
    }
}
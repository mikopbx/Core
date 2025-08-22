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

namespace MikoPBX\PBXCoreREST\Controllers\Passwords;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\PasswordsManagementProcessor;

/**
 * Password GET controller
 * 
 * @RoutePrefix("/pbxcore/api/v2/passwords")
 * 
 * Handles GET requests for password operations:
 * - /pbxcore/api/v2/passwords/generate - Generate secure password
 * 
 * @examples
 * 
 * # Generate default password (16 characters)
 * curl http://127.0.0.1/pbxcore/api/v2/passwords/generate
 * 
 * # Generate password with specific length
 * curl http://127.0.0.1/pbxcore/api/v2/passwords/generate?length=32
 * 
 * # Generate password without special characters
 * curl http://127.0.0.1/pbxcore/api/v2/passwords/generate?includeSpecial=false
 * 
 * # Generate password with custom parameters
 * curl "http://127.0.0.1/pbxcore/api/v2/passwords/generate?length=20&includeNumbers=true&includeSpecial=true"
 * 
 * @response examples
 * 
 * # Generate response
 * {
 *   "result": true,
 *   "data": {
 *     "password": "Kj8#mN2$pL9@vR4x",
 *     "length": 16,
 *     "score": 92,
 *     "strength": "strong"
 *   }
 * }
 * 
 * # Generate with custom length response
 * {
 *   "result": true,
 *   "data": {
 *     "password": "Wx3#nK9@mP2$vL8&tR5^qY7*zB4!jH6",
 *     "length": 32,
 *     "score": 100,
 *     "strength": "very_strong"
 *   }
 * }
 * 
 * @query parameters
 * - length (int): Password length (8-128, default: 16)
 * - includeNumbers (bool): Include numbers (default: true)
 * - includeSpecial (bool): Include special characters (default: true)
 * - includeLowercase (bool): Include lowercase letters (default: true)
 * - includeUppercase (bool): Include uppercase letters (default: true)
 */
class GetController extends BaseController
{
    /**
     * Process GET requests to passwords API
     * 
     * Currently supports password generation endpoint.
     * 
     * @Get("/generate")
     * 
     * @param string $actionName Action to execute (currently only 'generate')
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Use unified method to get request data
        $requestData = $this->request->getData();

        $getData = self::sanitizeData($requestData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            PasswordsManagementProcessor::class,
            $actionName,
            $getData
        );
    }
}
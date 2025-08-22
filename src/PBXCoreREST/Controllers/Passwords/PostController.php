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

namespace MikoPBX\PBXCoreREST\Controllers\Passwords;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\PasswordsManagementProcessor;

/**
 * Passwords POST controller
 * @RoutePrefix("/pbxcore/api/v2/passwords")
 *
 * Handles password-related operations:
 * - /pbxcore/api/v2/passwords/validate - Validate password strength
 * - /pbxcore/api/v2/passwords/generate - Generate secure password
 * - /pbxcore/api/v2/passwords/checkDictionary - Check against dictionary
 * - /pbxcore/api/v2/passwords/batchValidate - Validate multiple passwords
 * - /pbxcore/api/v2/passwords/batchCheckDictionary - Batch dictionary check
 * 
 * @examples
 * 
 * # Validate single password
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/validate \
 *   -H "Content-Type: application/json" \
 *   -d '{"password":"MyP@ssw0rd123","field":"WebAdminPassword"}'
 * 
 * # Generate password with specific length
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/generate \
 *   -H "Content-Type: application/json" \
 *   -d '{"length":24,"includeSpecial":true}'
 * 
 * # Check if password is in dictionary
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/checkDictionary \
 *   -H "Content-Type: application/json" \
 *   -d '{"password":"password123"}'
 * 
 * # Batch validate multiple passwords with contexts
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/batchValidate \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "passwords": [
 *       {"password":"Admin123!","field":"WebAdminPassword"},
 *       {"password":"Ssh@2024","field":"SSHPassword"},
 *       {"password":"Sip$ecret","field":"secret"}
 *     ],
 *     "skipDictionary": false
 *   }'
 * 
 * # Batch check multiple passwords against dictionary
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/passwords/batchCheckDictionary \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "passwords": ["password1","admin123","MyStr0ngP@ss","qwerty"],
 *     "returnDetails": true
 *   }'
 * 
 * @response examples
 * 
 * # Validate response
 * {
 *   "result": true,
 *   "data": {
 *     "isValid": true,
 *     "score": 85,
 *     "strength": "strong",
 *     "isDefault": false,
 *     "isSimple": false,
 *     "isTooShort": false,
 *     "isTooLong": false,
 *     "messages": [],
 *     "suggestions": []
 *   }
 * }
 * 
 * # Batch check dictionary response
 * {
 *   "result": true,
 *   "data": {
 *     "results": {
 *       "0": true,
 *       "1": true,
 *       "2": false,
 *       "3": true
 *     },
 *     "weakCount": 3,
 *     "weakIndexes": [0, 1, 3],
 *     "details": {
 *       "0": {"isInDictionary": true, "message": "Password found in common passwords dictionary"},
 *       "1": {"isInDictionary": true, "message": "Password found in common passwords dictionary"},
 *       "2": {"isInDictionary": false, "message": "Password is acceptable"},
 *       "3": {"isInDictionary": true, "message": "Password found in common passwords dictionary"}
 *     }
 *   }
 * }
 */
class PostController extends BaseController
{
    /**
     * Process POST requests to passwords API
     * 
     * @Post("/generate")
     * @Post("/validate")
     * @Post("/checkDictionary")
     * @Post("/batchValidate")
     * @Post("/batchCheckDictionary")
     *
     * @param string $actionName Action to execute (validate, generate, checkDictionary, batchValidate, batchCheckDictionary)
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Use unified method to get request data
        $requestData = $this->request->getData();

        $this->sendRequestToBackendWorker(
            PasswordsManagementProcessor::class,
            $actionName,
            self::sanitizeData($requestData, $this->filter)
        );
    }
}
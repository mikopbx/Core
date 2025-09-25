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

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\PasswordsManagementProcessor;

/**
 * RESTful controller for passwords management (v3 API)
 *
 * Passwords is a singleton resource - there's only one password service in the system.
 * This controller implements custom methods for password operations.
 *
 * @RoutePrefix("/pbxcore/api/v3/passwords")
 *
 * @examples Custom method operations:
 *
 * # Generate secure password
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/passwords:generate"
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/passwords:generate?length=32&includeSpecial=true"
 *
 * # Validate password strength
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/passwords:validate \
 *      -H "Content-Type: application/json" \
 *      -d '{"password":"MyP@ssw0rd123","field":"WebAdminPassword"}'
 *
 * # Check password against dictionary
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/passwords:checkDictionary \
 *      -H "Content-Type: application/json" \
 *      -d '{"password":"password123"}'
 *
 * # Batch validate multiple passwords
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/passwords:batchValidate \
 *      -H "Content-Type: application/json" \
 *      -d '{"passwords":[{"password":"Admin123!","field":"WebAdminPassword"}]}'
 *
 * # Batch check multiple passwords against dictionary
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/passwords:batchCheckDictionary \
 *      -H "Content-Type: application/json" \
 *      -d '{"passwords":["password1","admin123","MyStr0ngP@ss"]}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Passwords
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = PasswordsManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['generate'],
            'POST' => ['validate', 'generate', 'checkDictionary', 'batchValidate', 'batchCheckDictionary']
        ];
    }
}
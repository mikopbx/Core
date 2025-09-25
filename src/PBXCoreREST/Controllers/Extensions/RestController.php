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

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ExtensionsManagementProcessor;

/**
 * RESTful controller for extensions management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods for extension management.
 * This controller provides a read-only aggregator for extensions created through
 * other entities (Employees, IVR menus, etc.)
 *
 * @RoutePrefix("/pbxcore/api/v3/extensions")
 *
 * @examples Standard CRUD operations:
 * GET    /pbxcore/api/v3/extensions             - List all extensions
 * GET    /pbxcore/api/v3/extensions/123         - Get extension 123
 * POST   /pbxcore/api/v3/extensions             - Create new extension
 * PUT    /pbxcore/api/v3/extensions/123         - Update extension 123
 * PATCH  /pbxcore/api/v3/extensions/123         - Partially update extension 123
 * DELETE /pbxcore/api/v3/extensions/123         - Delete extension 123
 *
 * @examples Collection-level custom methods:
 * GET    /pbxcore/api/v3/extensions:getDefault  - Get default values for new extension
 * GET    /pbxcore/api/v3/extensions:getForSelect - Get extensions for dropdown
 * POST   /pbxcore/api/v3/extensions:available   - Check if extension number is available
 * POST   /pbxcore/api/v3/extensions:getPhonesRepresent - Get phone representations
 *
 * @examples Resource-level custom methods:
 * POST   /pbxcore/api/v3/extensions:getPhoneRepresent/123 - Get phone representation for extension 123
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Extensions
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     */
    protected string $processorClass = ExtensionsManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => [
                'getDefault',
                'getForSelect'
            ],
            'POST' => ['available', 'getPhonesRepresent', 'getPhoneRepresent']
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        $resourceLevelMethods = [
            'getPhoneRepresent'
        ];

        return in_array($method, $resourceLevelMethods, true);
    }
}
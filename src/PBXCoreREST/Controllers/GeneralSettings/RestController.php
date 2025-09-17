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

namespace MikoPBX\PBXCoreREST\Controllers\GeneralSettings;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\GeneralSettingsManagementProcessor;

/**
 * RESTful controller for general settings management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods for system-wide settings.
 * This controller implements a clean RESTful interface with proper HTTP methods.
 *
 * @RoutePrefix("/pbxcore/api/v3/general-settings")
 *
 * @examples Standard CRUD operations:
 *
 * # Get all general settings
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/general-settings
 *
 * # Get specific setting by key
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/general-settings/PBXName
 *
 * # Full update (replace all) settings
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/general-settings \
 *      -H "Content-Type: application/json" \
 *      -d '{"PBXName":"My PBX","PBXDescription":"Company PBX"}'
 *
 * # Partial update (modify) settings
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/general-settings \
 *      -H "Content-Type: application/json" \
 *      -d '{"PBXName":"New Name"}'
 *
 * @examples Custom method operations:
 *
 * # Get default values for settings
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/general-settings:getDefault
 *
 * # Update codecs configuration
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/general-settings:updateCodecs \
 *      -H "Content-Type: application/json" \
 *      -d '{"codecs":[{"name":"alaw","priority":0,"disabled":false}]}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\GeneralSettings
 */
class RestController extends BaseRestController
{
    protected string $processorClass = GeneralSettingsManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault'],
            'POST' => ['updateCodecs']
        ];
    }

    /**
     * Override handleCRUDRequest for singleton resource behavior
     * GeneralSettings is a singleton - there's only one set of settings
     *
     * @param string|null $id Resource ID (ignored for singleton)
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Validate processor class is set
        if (empty($this->processorClass)) {
            $this->sendErrorResponse('Processor class not configured', 500);
            return;
        }

        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Get HTTP method and determine action
        $httpMethod = $this->request->getMethod();

        // Map HTTP method to action for singleton resource
        $action = match($httpMethod) {
            'GET' => !empty($id) ? 'getRecord' : 'getList',  // Support both /settings and /settings/{key}
            'PUT' => 'update',     // Full update
            'PATCH' => 'patch',    // Partial update
            'POST' => 'create',    // Can be used for reset or special actions
            'DELETE' => 'delete',  // Reset to defaults
            default => null
        };

        if ($action === null) {
            $this->sendErrorResponse("Invalid HTTP method: $httpMethod", 405);
            return;
        }

        // Add the setting key as ID if provided (for GET /settings/{key})
        if (!empty($id)) {
            $requestData['id'] = $id;
        }

        // For POST/PUT/PATCH operations, pass HTTP method for processors that need it
        if (in_array($httpMethod, ['POST', 'PUT', 'PATCH'], true)) {
            $requestData['httpMethod'] = $httpMethod;
        }

        // Send request to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $action,
            $requestData
        );
    }
}
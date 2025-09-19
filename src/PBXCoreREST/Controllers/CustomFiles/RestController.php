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

namespace MikoPBX\PBXCoreREST\Controllers\CustomFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CustomFilesManagementProcessor;

/**
 * RESTful controller for custom files management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/custom-files")
 *
 * @examples Standard CRUD operations:
 *
 * # List all custom files with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/custom-files?limit=20&offset=0&search=/etc"
 *
 * # Get specific custom file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/custom-files/123
 *
 * # Create new custom file
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/custom-files \
 *      -H "Content-Type: application/json" \
 *      -d '{"filepath":"/etc/custom.conf","content":"base64encoded","mode":"append"}'
 *
 * # Full update (replace) custom file
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/custom-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"filepath":"/etc/custom.conf","content":"newbase64","mode":"override"}'
 *
 * # Partial update (modify) custom file
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/custom-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"mode":"script"}'
 *
 * # Delete custom file
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/custom-files/123
 *
 * @examples Custom method operations:
 *
 * # Get default values for new custom file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/custom-files:getDefault
 *
 * @package MikoPBX\PBXCoreREST\Controllers\CustomFiles
 */
class RestController extends BaseRestController
{
    protected string $processorClass = CustomFilesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault'],
            'POST' => [] // Future expansion: export, import, batchCreate, etc.
        ];
    }
}
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
 * GeneralSettings is a singleton resource - there's only one set of settings in the system.
 * This controller implements standard REST operations without resource IDs.
 *
 * @RoutePrefix("/pbxcore/api/v3/general-settings")
 *
 * @examples Singleton operations:
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
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = GeneralSettingsManagementProcessor::class;

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
            'GET' => ['getDefault'],
            'POST' => ['updateCodecs']
        ];
    }
}
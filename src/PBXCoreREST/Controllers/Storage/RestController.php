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

namespace MikoPBX\PBXCoreREST\Controllers\Storage;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\StorageManagementProcessor;

/**
 * RESTful controller for Storage management (v3 API)
 *
 * Storage is a singleton resource - there's only one storage configuration in the system.
 * This controller implements standard REST operations without resource IDs.
 *
 * @RoutePrefix("/pbxcore/api/v3/storage")
 *
 * @examples Singleton operations:
 *
 * # Get Storage settings (singleton GET)
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/storage
 *
 * # Update Storage settings (singleton PUT)
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/storage \
 *      -H "Content-Type: application/json" \
 *      -d '{"PBXRecordSavePeriod":"180"}'
 *
 * # Partially update settings (singleton PATCH)
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/storage \
 *      -H "Content-Type: application/json" \
 *      -d '{"PBXRecordSavePeriod":"360"}'
 *
 * # Get storage usage statistics (custom method)
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/storage/usage
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Storage
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = StorageManagementProcessor::class;

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
            'GET' => ['usage', 'list'],
            'POST' => ['mount', 'umount', 'mkfs', 'statusMkfs']
        ];
    }
}
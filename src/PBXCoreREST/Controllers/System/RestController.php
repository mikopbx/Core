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

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;

/**
 * RESTful controller for system management (v3 API)
 *
 * System is a singleton resource representing the PBX system itself.
 * Most operations are custom methods (commands) rather than CRUD operations.
 *
 * @RoutePrefix("/pbxcore/api/v3/system")
 *
 * @examples Power management commands:
 *
 * # Reboot the system
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/system:reboot
 *
 * # Shutdown the system
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/system:shutdown
 *
 * @examples Health check commands:
 *
 * # Ping backend
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/system:ping
 *
 * # Check authentication
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/system:checkAuth
 *
 * @examples Date/Time operations:
 *
 * # Get current system date and time
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/system:datetime
 *
 * # Set system date and time
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/system:datetime \
 *      -H "Content-Type: application/json" \
 *      -d '{"timestamp":1602509882}'
 *
 * @deprecated Email operations moved to /pbxcore/api/v3/mail-settings
 *
 * @examples Utility commands:
 *
 * # Convert audio file
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/system:convertAudioFile \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"/tmp/audio.mp3"}'
 *
 * # Upgrade system from image
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/system:upgrade \
 *      -H "Content-Type: application/json" \
 *      -d '{"filename":"/tmp/mikopbx.img"}'
 *
 * # Restore default settings
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/system:restoreDefault
 *
 * # Get delete statistics before restore
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/system:getDeleteStatistics
 *
 * @package MikoPBX\PBXCoreREST\Controllers\System
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SystemManagementProcessor::class;

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
            'GET' => [
                'ping',
                'checkAuth',
                'getDeleteStatistics',
                'datetime'
            ],
            'PUT' => [
                'datetime'
            ],
            'POST' => [
                'reboot',
                'shutdown',
                'updateMailSettings',
                'convertAudioFile',
                'upgrade',
                'restoreDefault'
            ]
        ];
    }

    /**
     * Override to add HTTP method to request data for datetime custom method
     *
     * @param string|null $idOrMethod Resource ID or custom method name
     * @param string|null $customMethod Custom method name (if ID is present)
     * @return void
     */
    public function handleCustomAction(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        $id = null;
        $actualMethod = null;

        if ($customMethod !== null) {
            $id = $idOrMethod;
            $actualMethod = $customMethod;
        } else {
            $actualMethod = $idOrMethod;
        }

        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Add HTTP method for datetime action
        if ($actualMethod === 'datetime') {
            $requestData['httpMethod'] = $this->request->getMethod();
        }

        // Add ID if provided for resource-specific custom methods
        if (!empty($id)) {
            $requestData['id'] = $id;
        }

        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $actualMethod,
            $requestData
        );
    }
}
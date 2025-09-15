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

namespace MikoPBX\PBXCoreREST\Controllers\IaxProviders;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * RESTful controller for IAX providers management (v3 API)
 * 
 * Handles only IAX providers with standard CRUD operations and custom methods.
 * This controller automatically filters operations to work only with IAX type providers.
 * 
 * @RoutePrefix("/pbxcore/api/v3/iax-providers")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all IAX providers
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/iax-providers?limit=20&offset=0"
 * 
 * # Get specific IAX provider
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123
 * 
 * # Create new IAX provider
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/iax-providers \
 *      -H "Content-Type: application/json" \
 *      -d '{"provider_name":"Main IAX Provider","host":"iax.provider.com","username":"user","secret":"pass"}'
 * 
 * # Full update (replace) IAX provider
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"provider_name":"Updated Provider","host":"new.provider.com","username":"newuser"}'
 * 
 * # Partial update (modify) IAX provider
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"host":"updated.provider.com"}'
 * 
 * # Delete IAX provider
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new IAX provider
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/iax-providers:getDefault
 * 
 * # Get IAX provider status
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123:getStatus
 * 
 * # Force status check for IAX provider
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123:forceCheck
 * 
 * # Update provider status (enable/disable)
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/iax-providers/IAX-PROV-123:updateStatus \
 *      -H "Content-Type: application/json" \
 *      -d '{"disabled":false}'
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IaxProviders
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ProvidersManagementProcessor::class;
    
    /**
     * Provider type for this controller
     * @var string
     */
    protected string $providerType = 'IAX';
    
    /**
     * Override sendRequestToBackendWorker to force IAX type
     * 
     * @param string $processor The name of the processor.
     * @param string $actionName The name of the action.
     * @param mixed|null $payload The payload data to send with the request.
     * @param string $moduleName The name of the module (only for 'modules' processor).
     * @param int $maxTimeout The maximum timeout for the request in seconds.
     * @param int $priority The priority of the request.
     * @return void
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        mixed $payload = null,
        string $moduleName = '',
        int $maxTimeout = 30,
        int $priority = 0
    ): void {
        // Force IAX type for all operations
        if (is_array($payload)) {
            $payload['type'] = $this->providerType;
        }
        
        parent::sendRequestToBackendWorker($processor, $actionName, $payload, $moduleName, $maxTimeout, $priority);
    }
    
    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'getStatuses', 'getStatus', 'getHistory', 'getStats', 'copy'],
            'POST' => ['forceCheck', 'updateStatus']
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
        // 'copy' is a resource-level method that requires an ID
        return $method === 'copy' || parent::isResourceLevelMethod($method);
    }
    
}
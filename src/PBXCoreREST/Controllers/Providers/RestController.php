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

namespace MikoPBX\PBXCoreREST\Controllers\Providers;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

/**
 * READ-ONLY RESTful controller for providers listing (v3 API)
 * 
 * This controller provides read-only access to both SIP and IAX providers.
 * For create/update/delete operations, use type-specific endpoints:
 * - /api/v3/sip-providers for SIP providers
 * - /api/v3/iax-providers for IAX providers
 * 
 * @RoutePrefix("/pbxcore/api/v3/providers")
 * 
 * @examples Read operations:
 * 
 * # List all providers (both SIP and IAX) with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/providers?limit=20&offset=0&type=SIP"
 * 
 * # Get specific provider (type determined automatically)
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/providers/PROV-123
 * 
 * @examples Custom method operations:
 * 
 * # Get providers for dropdown select
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/providers:getForSelect?type=SIP"
 * 
 * # Get all provider statuses
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/providers:getStatuses
 * 
 * # Get specific provider status
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/providers/PROV-123:getStatus
 * 
 * # Get provider history
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/providers/PROV-123:getHistory
 * 
 * # Get provider statistics
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/providers/PROV-123:getStats
 * 
 * @deprecated Write operations (POST, PUT, PATCH, DELETE) - use type-specific endpoints instead
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Providers
 */
class RestController extends BaseRestController
{
    protected string $processorClass = ProvidersManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * Only read operations are allowed
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getForSelect', 'getStatuses', 'getStatus', 'getHistory', 'getStats'],
            'POST' => [] // No write operations allowed
        ];
    }
    
    /**
     * Override action mapping to allow only read operations
     * Write operations return error
     * 
     * @return array<string, array<string, string>>
     */
    protected function getActionMapping(): array
    {
        return [
            'GET' => [
                'collection' => 'getList',
                'resource' => 'getRecord'
            ],
            'POST' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'PUT' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'PATCH' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ],
            'DELETE' => [
                'collection' => null, // Disabled
                'resource' => null    // Disabled
            ]
        ];
    }
    
    /**
     * Override handleCRUDRequest to provide better error messages for write operations
     * 
     * @param string|null $id Resource ID for single resource operations
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        $httpMethod = $this->request->getMethod();
        
        // Block write operations with helpful message
        if (in_array($httpMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $this->sendErrorResponse(
                "Write operations are not supported on /api/v3/providers. " .
                "Please use type-specific endpoints: " .
                "/api/v3/sip-providers for SIP providers or /api/v3/iax-providers for IAX providers.",
                405
            );
            return;
        }
        
        // Allow read operations
        parent::handleCRUDRequest($id);
    }
}
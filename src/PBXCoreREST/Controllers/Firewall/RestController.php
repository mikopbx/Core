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

namespace MikoPBX\PBXCoreREST\Controllers\Firewall;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\FirewallManagementProcessor;

/**
 * RESTful controller for firewall management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/firewall")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all firewall rules with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/firewall?limit=20&offset=0"
 * 
 * # Get specific firewall rule
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall/1
 * 
 * # Create new firewall rule
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall \
 *      -H "Content-Type: application/json" \
 *      -d '{"permit":"192.168.1.0/24","description":"Local network","rules":{"SIP":"allow","WEB":"allow"}}'
 * 
 * # Full update (replace) firewall rule
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/firewall/1 \
 *      -H "Content-Type: application/json" \
 *      -d '{"permit":"192.168.1.0/24","description":"Updated network","rules":{"SIP":"block","WEB":"allow"}}'
 * 
 * # Partial update (modify) firewall rule
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/firewall/1 \
 *      -H "Content-Type: application/json" \
 *      -d '{"description":"Modified description"}'
 * 
 * # Delete firewall rule
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/firewall/1
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new firewall rule
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall:getDefault
 * 
 * # Get banned IP addresses from fail2ban
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/firewall:getBannedIps
 * 
 * # Unban IP address
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:unbanIp \
 *      -H "Content-Type: application/json" \
 *      -d '{"ip":"192.168.1.100"}'
 * 
 * # Enable firewall and fail2ban
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:enable
 * 
 * # Disable firewall and fail2ban
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/firewall:disable
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\Firewall
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = FirewallManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'getBannedIps'],
            'POST' => ['unbanIp', 'enable', 'disable']
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
        // Collection-level methods that don't require an ID
        $collectionMethods = ['getDefault', 'getBannedIps', 'enable', 'disable'];
        
        // Resource-level methods that require an ID
        $resourceMethods = ['unbanIp'];
        
        if (in_array($method, $collectionMethods, true)) {
            return false;
        }
        
        if (in_array($method, $resourceMethods, true)) {
            return true;
        }
        
        // Default to parent implementation
        return parent::isResourceLevelMethod($method);
    }
}
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

namespace MikoPBX\PBXCoreREST\Controllers\NetworkFilters;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\NetworkFiltersManagementProcessor;

/**
 * NetworkFilters REST Controller (Read-Only)
 * 
 * Provides read-only access to network filters for dropdown lists.
 * Actual filter management is done through the Firewall API.
 * 
 * Routes:
 * - GET    /api/v3/network-filters          - Get list of all network filters
 * - GET    /api/v3/network-filters/{id}     - Get specific network filter
 * 
 * Custom methods:
 * - GET    /api/v3/network-filters:getForSelect - Get filters for dropdown with category filtering
 * 
 * Special features:
 * - Support for localhost (127.0.0.1) option for AMI/API categories
 * - Category-based filtering (SIP, IAX, AMI, API)
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\NetworkFilters
 */
class RestController extends BaseRestController
{
    /**
     * Processor class for handling network filters operations
     * 
     * @var string
     */
    protected string $processorClass = NetworkFiltersManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     * 
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getForSelect']
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
        $collectionMethods = ['getForSelect'];
        
        if (in_array($method, $collectionMethods, true)) {
            return false;
        }
        
        // Default to parent implementation
        return parent::isResourceLevelMethod($method);
    }
}
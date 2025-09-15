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

namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * RESTful controller for call queues management (v3 API)
 * 
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 * 
 * @RoutePrefix("/pbxcore/api/v3/call-queues")
 * 
 * @examples Standard CRUD operations:
 * 
 * # List all call queues with pagination and filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/call-queues?limit=20&offset=0&search=sales"
 * 
 * # Get specific call queue
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123
 * 
 * # Create new call queue
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/call-queues \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Sales Queue","extension":"800","strategy":"ringall"}'
 * 
 * # Full update (replace) call queue
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Sales Department","extension":"800","strategy":"rrmemory"}'
 * 
 * # Partial update (modify) call queue
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"strategy":"linear"}'
 * 
 * # Delete call queue
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/call-queues/QUEUE-123
 * 
 * @examples Custom method operations:
 * 
 * # Get default values for new call queue
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/call-queues:getDefault
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = CallQueuesManagementProcessor::class;
    
    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'copy'],
            'POST' => [] // Future expansion: export, import, batchCreate, etc.
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
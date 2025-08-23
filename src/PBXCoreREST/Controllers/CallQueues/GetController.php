<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * GET controller for call queues management
 *
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 *
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/QUEUE-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getList
 *
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class GetController extends BaseController
{
    /**
     * Handle GET requests for call queue operations
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     *
     * Get call queue record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     *
     * Retrieve the list of all call queues with member representations
     * @Get("/getList")
     *
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        if (!empty($id)){
            $requestData['id'] = $id;
        }

        // Send request to Worker following MikoPBX REST API architecture
        $this->sendRequestToBackendWorker(
            CallQueuesManagementProcessor::class,
            $actionName,
            $requestData
        );
    }
}

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
 * POST controller for call queues management
 *
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 *
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord \
 *   -d "name=Sales Queue&extension=2001&strategy=ringall"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class PostController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    /**
     * Handle POST requests for call queue operations
     *
     * @param string $actionName The name of the action
     *
     * Creates new call queue record
     * @Post("/saveRecord")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        $this->sendRequestToBackendWorker(
            CallQueuesManagementProcessor::class,
            $actionName,
            $requestData
        );
    }
}

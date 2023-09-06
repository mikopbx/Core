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

namespace MikoPBX\PBXCoreREST\Controllers\Storage;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\StorageManagementProcessor;

/**
 * Controller for handling storage-related actions using GET requests.
 * @RoutePrefix("/pbxcore/api/storage")
 *
 * @example
 *
 * Get list of connected disks.
 * curl http://172.16.156.212/pbxcore/api/storage/list
 */
class GetController extends BaseController
{
    /**
    * Handles the call action for storage using GET requests.
    *
    * @param string $actionName The name of the action.
     *
     * Get information about all HDD devices.
     * @Get("/list")
     *
    * @return void
    */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(StorageManagementProcessor::class, $actionName, $_REQUEST);
    }
}
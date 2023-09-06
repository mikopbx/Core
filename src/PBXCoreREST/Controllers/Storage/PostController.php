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
 * Controller for handling storage-related actions using POST requests.
 *
 * @RoutePrefix("/pbxcore/api/storage")
 *
 * @examples
 *
 * Mount a disk:
 *  curl -X POST -d '{"dev":"/dev/sdc1","format":"ext2","dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/mount;
 *
 * Unmount a disk:
 *  curl -X POST -d '{"dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/umount;
 *
 * Format a disk to ext2. Formatting is done in the background.
 *  curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/mkfs;
 *
 * Get the status of disk formatting:
 *  curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/statusMkfs;
 *
 * 'ended' / 'inprogress'
 */
class PostController extends BaseController
{
    /**
     * Handles the call action for storage using POST requests.
     *
     * @param string $actionName The name of the action.
     *
     * Mount a disk to a directory.
     * @Post("/mount")
     *
     * Unmount a disk.
     * @Post("/umount")
     *
     * Create a file system on a disk.
     * @Post("/mkfs")
     *
     * Get the status of mkfs process on a disk.
     * @Post("/statusMkfs")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $row_data = $this->request->getRawBody();
        $data     = json_decode($row_data, true);
        $this->sendRequestToBackendWorker(StorageManagementProcessor::class, $actionName, $data);
    }
}
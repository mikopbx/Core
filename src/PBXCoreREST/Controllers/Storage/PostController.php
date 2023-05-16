<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * Controller for handling storage-related actions using POST requests.
 *
 * @example
 * /api/storage/{name}
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
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $row_data = $this->request->getRawBody();
        $data     = json_decode($row_data, true);
        $this->sendRequestToBackendWorker('storage', $actionName, $data);
    }
}
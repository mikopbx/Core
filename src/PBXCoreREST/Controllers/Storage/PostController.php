<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
 * /api/storage/{name}
 * Монтируем диск:
 *   curl -X POST -d '{"dev":"/dev/sdc1","format":"ext2","dir":"/tmp/123"}'
 *   http://172.16.156.212/pbxcore/api/storage/mount; Размонтируем диск: curl -X POST -d '{"dir":"/tmp/123"}'
 *   http://172.16.156.212/pbxcore/api/storage/umount; Форматируем диск в ext2. Форматирование осуществляется в фоне.
 *   curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/mkfs; Получаем статус
 *   форматирования диска: curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/statusMkfs;
 *   'ended' / 'inprogress'
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $row_data = $this->request->getRawBody();
        $data     = json_decode($row_data, true);
        $this->sendRequestToBackendWorker('storage', $actionName, $data);
    }
}
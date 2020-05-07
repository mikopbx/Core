<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Storage;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /api/storage/{name}
 * Монтируем диск:
 *   curl -X POST -d '{"dev":"/dev/sdc1","format":"ext2","dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/mount;
 * Размонтируем диск:
 *   curl -X POST -d '{"dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/umount;
 * Форматируем диск в ext2. Форматирование осуществляется в фоне.
 *   curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/mkfs;
 * Получаем статус форматирования диска:
 *   curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/statusMkfs;
 *   'ended' / 'inprogress'
 */
class PostController extends BaseController
{
    public function callAction($actionName):void
    {
        $row_data = $this->request->getRawBody();
        $data = json_decode( $row_data, true);
        $this->sendRequestToBackendWorker('storage', $actionName, $data);
    }
}
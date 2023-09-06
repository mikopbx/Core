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

namespace MikoPBX\PBXCoreREST\Lib;



use MikoPBX\Core\System\Storage;
use Phalcon\Di\Injectable;

class StorageManagementProcessor extends Injectable
{
    /**
     * Processes Storage requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data   = $request['data'];
        $res    = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'list':
                $st           = new Storage();
                $res->success = true;
                $res->data    = $st->getAllHdd();
                break;
            case 'mount':
                $res->success = Storage::mountDisk($data['dev'], $data['format'], $data['dir']);
                break;
            case 'umount':
                $res->success = Storage::umountDisk($data['dir']);
                break;
            case 'mkfs':
                $res->success = Storage::mkfs_disk($data['dev']);
                if ($res->success) {
                    $res->data['status'] = 'inprogress';
                }
                break;
            case 'statusMkfs':
                $res->success        = true;
                $res->data['status'] = Storage::statusMkfs($data['dev']);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in storageCallBack";
        }

        $res->function = $action;

        return $res;
    }
}
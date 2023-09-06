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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Storage;
use Phalcon\Di\Injectable;


/**
 * Class StorageManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class StorageManagementProcessor extends Injectable
{
    /**
     * Processes storage requests.
     *
     * @param array $request The request data.
     *   - action: The action to be performed.
     *   - data: Additional data related to the action.
     *
     * @return PBXApiResult An object containing the result of the API call.
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
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        }

        $res->function = $action;

        return $res;
    }
}
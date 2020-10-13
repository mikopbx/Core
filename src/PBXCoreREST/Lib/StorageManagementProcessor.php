<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
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
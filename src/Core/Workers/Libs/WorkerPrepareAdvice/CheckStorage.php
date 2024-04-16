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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\System\Storage;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use Phalcon\Di\Injectable;

/**
 * Class CheckStorage
 * This class is responsible for checking free space on storage disk on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckStorage extends Injectable
{
    /**
     * Check storage status.
     *
     * @return array An array containing warning or error messages.
     *
     */
    public function process(): array
    {
        $messages = [];
        $st = new Storage();
        $storageDiskMounted = false;
        $disks = $st->getAllHdd();
        foreach ($disks as $disk) {
            if (array_key_exists('mounted', $disk)
                && strpos($disk['mounted'], '/storage/usbdisk') !== false) {
                $storageDiskMounted = true;
                if ($disk['free_space'] < WorkerRemoveOldRecords::MIN_SPACE_MB_ALERT) {
                    $messages['error'][] = [
                        'messageTpl'=>'adv_StorageDiskRunningOutOfFreeSpace',
                        'messageParams'=>[
                            'free'=> $disk['free_space']
                        ]
                    ];
                }
            }
        }
        if ($storageDiskMounted === false) {
            $messages['error'][] = ['messageTpl'=>'adv_StorageDiskUnMounted'];
        }
        return $messages;
    }

}
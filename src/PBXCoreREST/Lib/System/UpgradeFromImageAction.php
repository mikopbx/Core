<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Upgrade the PBX using uploaded IMG file.
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class UpgradeFromImageAction extends \Phalcon\Di\Injectable
{
    const CF_DEVICE = '/var/etc/cfdevice';
    const STORAGE_DEVICE = '/var/etc/storage_device';


    /**
     * Upgrade the PBX using uploaded IMG file.
     * @param string $imageFileLocation The location of the IMG file previously uploaded to the system.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string  $imageFileLocation): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $res->success         = true;
        $res->data['message'] = 'In progress...';

        list( $res->success,  $res->messages) = self::validateParameters($imageFileLocation);
        if (!$res->success){
           return $res;
        }
        $res->data['imageFileLocation'] = $imageFileLocation;

        // Generate update script
        $res->data['storage_uuid'] = self::getStorageUID();
        if ( empty($res->data['storage_uuid'])) {
            $res->success    = false;
            $res->messages[] = "The storage disk uid is empty!";
            return $res;
        }

        // Get CF disk UID
        $res->data['cf_uuid'] = self::getCfUID();
        if ( empty($res->data['cf_uuid'])) {
            $res->success    = false;
            $res->messages[] = "The CF disk uid is empty!";
            return $res;
        }

        // Get Boot device name
        $res->data['bootPartitionName'] = self::getBootPartitionName($res->data['cf_uuid']);
        if ( empty($res->data['bootPartitionName'])) {
            $res->success    = false;
            $res->messages[] = "The Boot partition name is empty!";
            return $res;
        }

        list( $res->success,  $res->messages) = self::writeUpdateScript($res->data);
        if ($res->success){
            System::rebootSyncBg();
        }
        return $res;
    }

    /**
     * Validate input parameters.
     * @param string $imageFileLocation The location of the IMG file previously uploaded to the system.
     * @return array
     */
    private static function validateParameters(string $imageFileLocation):array
    {
        $success = true;
        $messages = [];
        if ( ! file_exists($imageFileLocation)) {
            $success    = false;
            $messages[] = "The update file '{$imageFileLocation}' could not be found.";
        }

        if ( ! file_exists(self::CF_DEVICE)) {
            $success    = false;
            $messages[] = "The system setup has not been initiated.";
        }

        if ( ! file_exists(self::STORAGE_DEVICE)) {
            $success    = false;
            $messages[] = "The storage disk has not been mounted yet!";
        }

        return [$success, $messages];
    }

    /*
     * Get Storage disk UID
     *
     * @return string Storage disk UID
     */
    private static function getStorageUID():string
    {
        $busybox = Util::which('busybox');
        $storageDeviceFile = self::STORAGE_DEVICE;
        $cmd = "$busybox grep $($busybox  cat $storageDeviceFile) < /etc/fstab | $busybox awk -F'[= ]' '{ print \$2}'";
        return trim(shell_exec($cmd));
    }

    /**
    * Get configuration disk UID
    *
    * @return string configuration disk UID
    */
    private static function getCfUID() :string
    {
        $busybox = Util::which('busybox');
        $cmd = "$busybox grep '/cf' < /etc/fstab | $busybox awk -F'[= ]' '{ print \$2}'";
        return trim(shell_exec($cmd));
    }

    /**
     * Get boot disk partition name
     *
     * @return string boot disk partition name
     */
    private static function getBootPartitionName(string $cf_uuid) :string
    {
        $lsblk = Util::which('lsblk');
        $busybox = Util::which('busybox');
        $cmd = "$lsblk -o UUID,PKNAME -p | $busybox grep '$cf_uuid' | $busybox cut -f 2 -d ' '";
        $bootDeviceName = trim(shell_exec($cmd));
        return Storage::getDevPartName($bootDeviceName, 1);
    }

    /**
     * Prepare an update script, mount the boot partition and write the update script to the partition.
     *
     * @param array $parameters An array containing the parameters for the script.
     * @return array
     */
    private static function writeUpdateScript(array $parameters) :array
    {
        $messages = [];
        $updateSh = "#!/bin/sh".PHP_EOL.
            "export storage_uuid='{$parameters['storage_uuid']}';".PHP_EOL.
            "export cf_uuid='{$parameters['cf_uuid']}';".PHP_EOL.
            "export updateFile='{$parameters['imageFileLocation']}';".PHP_EOL;

        // Mount boot partition
        $systemDir = '/system';
        Util::mwMkdir($systemDir);
        $result = Processes::mwExec("mount /dev/{$parameters['bootPartitionName']} $systemDir");
        if($result === 0) {
            file_put_contents("$systemDir/update.sh", $updateSh);
            $success    = true;
        } else {
            $messages[] = "Failed to mount the boot partition /dev/{$parameters['bootPartitionName']}";
            $success    = false;
        }
        return [$success, $messages];
    }
}
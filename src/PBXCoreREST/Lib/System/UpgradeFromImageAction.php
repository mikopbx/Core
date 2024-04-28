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

    const MIN_SPACE_MB = 400;


    /**
     * Upgrade the PBX using uploaded IMG file.
     * @param string $imageFileLocation The location of the IMG file previously uploaded to the system.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $imageFileLocation): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data['message'] = 'In progress...';

        // Validate input parameters.
        list($res->success, $res->messages) = self::validateParameters($imageFileLocation);
        if (!$res->success) {
            return $res;
        }

        // Check free space
        list($res->success, $res->messages) = self::calculateFreeSpace();
        if (!$res->success) {
            return $res;
        }

        $res->data['imageFileLocation'] = $imageFileLocation;

        // Generate update script
        $res->data['storage_uuid'] = self::getStorageUID();
        if (empty($res->data['storage_uuid'])) {
            $res->success = false;
            $res->messages[] = "The storage disk uid is empty!";
            return $res;
        }

        // Get CF disk UID
        $res->data['cf_uuid'] = self::getCfUID();
        if (empty($res->data['cf_uuid'])) {
            $res->success = false;
            $res->messages[] = "The CF disk uid is empty!";
            return $res;
        }

        // Get Boot device name
        $res->data['bootPartition'] = self::getBootPartitionName($res->data['cf_uuid']);
        if (empty($res->data['bootPartition'])) {
            $res->success = false;
            $res->messages[] = "The Boot partition didn't find by cf_uuid={$res->data['cf_uuid']}!";
            return $res;
        }

        // Write update script
        list($res->success, $res->messages) = self::writeUpdateScript($res->data);
        if ($res->success) {
            System::reboot();
        }
        return $res;
    }

    /**
     * Validate input parameters.
     * @param string $imageFileLocation The location of the IMG file previously uploaded to the system.
     * @return array
     */
    private static function validateParameters(string $imageFileLocation): array
    {
        $success = true;
        $messages = [];
        if (!file_exists($imageFileLocation)) {
            $success = false;
            $messages[] = "The update file '{$imageFileLocation}' could not be found.";
        }

        if (!file_exists(self::CF_DEVICE)) {
            $success = false;
            $messages[] = "The system setup has not been initiated.";
        }

        if (!file_exists(self::STORAGE_DEVICE)) {
            $success = false;
            $messages[] = "The storage disk has not been mounted yet!";
        }

        return [$success, $messages];
    }

    /*
     * Get Storage disk UID
     *
     * @return string Storage disk UID
     */

    /**
     * Calculates the free space on the storage disk before upgrade.
     * @return array
     */
    private static function calculateFreeSpace(): array
    {
        $success = true;
        $messages = [];
        $storageDevice = file_get_contents(self::STORAGE_DEVICE);
        if (Storage::getFreeSpace($storageDevice) < self::MIN_SPACE_MB) {
            $success = false;
            $messages[] = "The storage disk has less than " . self::MIN_SPACE_MB . " MB free space.";
        }
        return [$success, $messages];
    }

    private static function getStorageUID(): string
    {
        $grep = Util::which('grep');
        $cat = Util::which('cat');
        $awk = Util::which('awk');
        $storageDeviceFile = self::STORAGE_DEVICE;
        $cmd = "$grep $($cat $storageDeviceFile) < /etc/fstab | $awk -F'[= ]' '{ print \$2}'";
        return trim(shell_exec($cmd));
    }

    /**
     * Get configuration disk UID
     *
     * @return string configuration disk UID
     */
    private static function getCfUID(): string
    {
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $cmd = "$grep '/cf' < /etc/fstab | $awk -F'[= ]' '{ print \$2}'";
        return trim(shell_exec($cmd));
    }

    /**
     * Get boot disk partition name
     *
     * @return string boot disk partition name
     */
    private static function getBootPartitionName(string $cf_uuid): string
    {
        $lsblk = Util::which('lsblk');
        $grep = Util::which('grep');
        $cut = Util::which('cut');
        $cmd = "$lsblk -o UUID,PKNAME -p | $grep '$cf_uuid' | $cut -f 2 -d ' '";
        $bootDeviceName = trim(shell_exec($cmd));
        return Storage::getDevPartName($bootDeviceName, 1);
    }

    /**
     * Prepare an update script, mount the boot partition and write the update script to the partition.
     *
     * @param array $parameters An array containing the parameters for the script.
     * @return array
     */
    private static function writeUpdateScript(array $parameters): array
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        // Mount boot partition
        $systemDir = '/system';
        Util::mwMkdir($systemDir);
        $mount = Util::which('mount');
        $result = Processes::mwExec("$mount {$parameters['bootPartition']} $systemDir");
        if ($result === 0) {
            $upgradeScriptDir = "$systemDir/upgrade";
            Util::mwMkdir($upgradeScriptDir);
            self::prepareEnvironmentFile($upgradeScriptDir, $parameters);

            // Write the future release update script to the boot partition
            $res = self::extractNewUpdateScript($parameters['imageFileLocation'], $upgradeScriptDir);
            if (!$res->success) {
                $res = self::extractCurrentUpdateScript($upgradeScriptDir);
                if ($res->success) {
                    $res->messages[] = "The update script has been written to the boot partition.";
                }
            }
        } else {
            $res->messages[] = "Failed to mount the boot partition {$parameters['bootPartition']}";
            $res->success = false;
        }

        $umount = Util::which('mount');
        Processes::mwExec("$umount /dev/{$parameters['bootPartitionName']}");

        return [$res->success, $res->messages];
    }

    /**
     * Prepares and executes a script to handle an IMG file upgrade.
     *
     * @param string $imageFileLocation The location of the IMG file.
     * @param string $desiredLocation The desired location for the extracted files.
     * @return PBXApiResult An object containing the result of the operation.
     */
    private static function extractNewUpdateScript(string $imageFileLocation, string $desiredLocation): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $decompressedImg = $imageFileLocation . '-decompressed.img';
        $mountPoint = '/mnt/image_partition';

        // Ensure mount point directory exists
        Util::mwMkdir($mountPoint);
        Util::mwMkdir($desiredLocation);

        // Decompress the IMG file
        $gunzip = Util::which('gunzip');
        $decompressCmd = "$gunzip -c '{$imageFileLocation}' > '{$decompressedImg}'";
        Processes::mwExec($decompressCmd);

        // Setup loop device with the correct offset
        $offset = 1024 * 512;
        $loopDev = self::setupLoopDevice($decompressedImg, $offset);

        if (empty($loopDev)) {
            $res->success = false;
            $res->messages[] = "Failed to set up the loop device.";
            return $res;
        }

        // Mount the first partition as FAT16
        $mount = Util::which('mount');
        $result = Processes::mwExec("$mount -t vfat $loopDev $mountPoint -o ro,umask=0000");
        if ($result !== 0) {
            $res->success = false;
            $res->messages[] = "Failed to mount the first partition. Check filesystem and options.";
            return $res;
        }

        // Extract files from initramfs.igz
        $initramfsPath = "{$mountPoint}/boot/initramfs.igz";
        self::extractFileFromInitramfs($initramfsPath, 'sbin/firmware_upgrade.sh', "{$desiredLocation}/firmware_upgrade.sh");
        self::extractFileFromInitramfs($initramfsPath, 'sbin/pbx_firmware', "{$desiredLocation}/pbx_firmware");
        self::extractFileFromInitramfs($initramfsPath, 'etc/version', "{$desiredLocation}/version");

        // Clean-up
        $umount = Util::which('umount');
        Processes::mwExec("$umount $mountPoint");
        self::destroyLoopDevice($loopDev);
        unlink($decompressedImg);

        // Check files
        if (filesize("{$desiredLocation}/firmware_upgrade.sh")===0
            || filesize("{$desiredLocation}/pbx_firmware")===0
            || filesize("{$desiredLocation}/version")===0
        ) {
            $res->success = false;
            $res->messages[] = "Failed to extract required files from the initramfs image.";
        } else {
            $res->success = true;
            $res->data['message'] = "Upgrade process completed successfully.";
        }

        return $res;
    }

    /**
     * Copy current release upgrade script to the desired location.
     * @param string $desiredLocation The desired location for the extracted files.
     * @return PBXApiResult
     */
    private static function extractCurrentUpdateScript(string $desiredLocation): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $upgradeScript = '/sbin/firmware_upgrade.sh';
        $cp = Util::which('cp');
        Processes::mwExec("$cp -f $upgradeScript $desiredLocation");

        $pbx_firmware = '/sbin/pbx_firmware';
        Processes::mwExec("$cp -f $pbx_firmware $desiredLocation");
        return $res;
    }

    /**
     * Sets up a loop device for a specified image file at a given offset.
     *
     * @param string $filePath The path to the file that needs a loop device.
     * @param int $offset The byte offset at which to start the loop device.
     * @return string|null The path to the loop device, or null if the setup failed.
     */
    private static function setupLoopDevice(string $filePath, int $offset): ?string
    {
        $losetup = Util::which('losetup');
        $cmd = "{$losetup} --show -f -o {$offset} {$filePath}";

        // Execute the command and capture the output
        Processes::mwExec($cmd, $output, $returnVar);
        if ($returnVar === 0 && !empty($output[0])) {
            return $output[0];  // Returns the path to the loop device, e.g., /dev/loop0
        }

        return null;  // Return null if the command failed
    }

    /**
     * Extracts a specific file from an initramfs image.
     *
     * @param string $initramfsPath The path to the initramfs file.
     * @param string $filePath The path of the file inside the initramfs.
     * @param string $outputPath Where to save the extracted file.
     *
     * @return void
     */
    private static function extractFileFromInitramfs(string $initramfsPath, string $filePath, string $outputPath): void
    {
        $gunzip = Util::which('gunzip');
        $cpio = Util::which('cpio');
        $cmd = "$gunzip -c '{$initramfsPath}' | $cpio -i --to-stdout '{$filePath}' 2>/dev/null> '{$outputPath}'";
        exec($cmd);
    }

    /**
     * Destroys a loop device, freeing it up for other uses.
     *
     * @param string $loopDevice The path to the loop device (e.g., /dev/loop0).
     * @return void
     */
    private static function destroyLoopDevice(string $loopDevice): void
    {
        $losetup = Util::which('losetup');
        $cmd = "{$losetup} -d {$loopDevice}";
        Processes::mwExec($cmd, $output, $returnVar);
    }

    /**
     * Prepares the .env file for the upgrade process.
     *
     * @param string $path The path to the directory containing the .env file.
     * @param array $parameters An array containing the parameters for the .env file.
     * @return void
     */
    private static function prepareEnvironmentFile(string $path, array $parameters): void
    {
        $envFilePath = "$path/.env";
        $config = [
            'STORAGE_UUID' => $parameters['storage_uuid'],
            'CF_UUID' => $parameters['cf_uuid'],
            'UPDATE_IMG_FILE' => $parameters['imageFileLocation'],
        ];
        $file = fopen($envFilePath, 'w');

        foreach ($config as $key => $value) {
            fwrite($file, "$key='$value'\n");
        }
        fclose($file);
    }
}
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

namespace MikoPBX\Core\System;

use Error;
use JsonException;
use MikoPBX\Common\Config\ClassLoader;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\System\ConvertAudioFileAction;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di;
use function MikoPBX\Common\Config\appPath;

/**
 * Class Storage
 *
 * Manages storage-related operations.
 *
 * @package MikoPBX\Core\System
 * @property \Phalcon\Config config
 */
class Storage extends Di\Injectable
{
    /**
     * Move read-only sounds to the storage.
     * This function assumes a storage disk is mounted.
     *
     * @return void
     */
    public function moveReadOnlySoundsToStorage(): void
    {
        // Check if a storage disk is mounted
        if (!self::isStorageDiskMounted()) {
            return;
        }

        // Create the current media directory if it doesn't exist
        $currentMediaDir =  $this->config->path('asterisk.customSoundDir'). '/';
        if (!file_exists($currentMediaDir)) {
            Util::mwMkdir($currentMediaDir);
        }

        $soundFiles = SoundFiles::find();

        // Iterate through each sound file
        foreach ($soundFiles as $soundFile) {
            if (stripos($soundFile->path, '/offload/asterisk/sounds/other/') === 0) {
                $newPath = $currentMediaDir . pathinfo($soundFile->path)['basename'];

                // Copy the sound file to the new path
                if (copy($soundFile->path, $newPath)) {
                    ConvertAudioFileAction::main($newPath);

                    // Update the sound file path and extension
                    $soundFile->path = Util::trimExtensionForFile($newPath) . ".mp3";

                    // Update the sound file if the new path exists
                    if (file_exists($soundFile->path)) {
                        $soundFile->update();
                    }
                }
            }
        }
        unset($soundFiles);
    }

    /**
     * Check if a storage disk is mounted.
     *
     * @param string $filter Optional filter for the storage disk.
     * @param string $mount_dir If the disk is mounted, the mount directory will be stored in this variable.
     * @return bool Returns true if the storage disk is mounted, false otherwise.
     */
    public static function isStorageDiskMounted(string $filter = '', string &$mount_dir = ''): bool
    {
        // Check if it's a T2Sde Linux and /storage/usbdisk1/ exists
        if (!Util::isT2SdeLinux()
            && file_exists('/storage/usbdisk1/')
        ) {
            $mount_dir = '/storage/usbdisk1/';
            return true;
        }
        if ('' === $filter) {
            $varEtcDir = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
            $filename = "$varEtcDir/storage_device";

            // If the storage_device file exists, read its contents as the filter, otherwise use 'usbdisk1' as the filter
            if (file_exists($filename)) {
                $filter = file_get_contents($filename);
            } else {
                $filter = 'usbdisk1';
            }
        }
        $grep = Util::which('grep');
        $mount = Util::which('mount');
        $awk = Util::which('awk');
        $head = Util::which('head');

        $filter = escapeshellarg($filter);

        // Execute the command to filter the mount points based on the filter
        $out = shell_exec("$mount | $grep $filter | $awk '{print $3}' | $head -n 1");
        $mount_dir = trim($out);
        return ($mount_dir !== '');
    }

    /**
     * Copy MOH (Music on Hold) files to the storage.
     * This function assumes a storage disk is mounted.
     *
     * @return void
     */
    public function copyMohFilesToStorage(): void
    {
        // Check if a storage disk is mounted
        if (!self::isStorageDiskMounted()) {
            return;
        }

        $oldMohDir =  $this->config->path('asterisk.astvarlibdir'). '/sounds/moh';
        $currentMohDir = $this->config->path('asterisk.mohdir');

        // If the old MOH directory doesn't exist or unable to create the current MOH directory, return
        if (!file_exists($oldMohDir) || Util::mwMkdir($currentMohDir)) {
            return;
        }

        $files = scandir($oldMohDir);

        // Iterate through each file in the old MOH directory
        foreach ($files as $file) {
            if (in_array($file, ['.', '..'])) {
                continue;
            }

            // Copy the file from the old MOH directory to the current MOH directory
            if (copy($oldMohDir . '/' . $file, $currentMohDir . '/' . $file)) {
                $sound_file = new SoundFiles();
                $sound_file->path = $currentMohDir . '/' . $file;
                $sound_file->category = SoundFiles::CATEGORY_MOH;
                $sound_file->name = $file;
                $sound_file->save();
            }
        }
    }

    /**
     * Create a file system on a disk.
     *
     * @param string $dev The device path of the disk.
     * @return bool Returns true if the file system creation process is initiated, false otherwise.
     */
    public static function mkfs_disk(string $dev):bool
    {
        if (!file_exists($dev)) {
            $dev = "/dev/$dev";
        }
        if (!file_exists($dev)) {
            return false;
        }
        $dir = '';
        self::isStorageDiskMounted($dev, $dir);

        // If the disk is not mounted or successfully unmounted, proceed with the file system creation
        if (empty($dir) || self::umountDisk($dir)) {
            $st = new self();
            // Initiate the file system creation process
            $st->formatEntireDisk($dev, true);
            sleep(1);

            return (self::statusMkfs($dev) === 'inprogress');
        }

        // Error occurred during disk unmounting
        return false;
    }

    /**
     * Unmount a disk.
     *
     * @param string $dir The mount directory of the disk.
     * @return bool Returns true if the disk is successfully unmounted, false otherwise.
     */
    public static function umountDisk(string $dir): bool
    {
        $umount = Util::which('umount');
        $rm = Util::which('rm');

        // If the disk is mounted, terminate processes using the disk and unmount it
        if (self::isStorageDiskMounted($dir)) {
            Processes::mwExec("/sbin/shell_functions.sh 'killprocesses' '$dir' -TERM 0");
            Processes::mwExec("$umount $dir");
        }
        $result = !self::isStorageDiskMounted($dir);

        // If the disk is successfully unmounted and the directory exists, remove the directory
        if ($result && file_exists($dir)) {
            Processes::mwExec("$rm -rf '$dir'");
        }

        return $result;
    }

    /**
     * Format a disk locally using parted command and create one partition
     *
     * @param string $device The device path of the disk.
     * @param bool $bg Whether to run the command in the background.
     * @return bool Returns true if the disk formatting process is initiated, false otherwise.
     */
    public function formatEntireDisk(string $device, bool $bg = false): bool
    {
        $parted = Util::which('parted');

        // First, remove existing partitions and then create a new msdos partition table and ext4 partition
        // This command deletes all existing partitions and creates a new primary partition using the full disk
        $command = "$parted --script --align optimal '$device' 'mklabel msdos'";
        Processes::mwExec($command);  // Apply the command to clear the partition table

        // Now create a new partition that spans the entire disk
        $createPartCommand = "$parted --script --align optimal '$device' 'mkpart primary ext4 0% 100%'";
        $retVal = Processes::mwExec($createPartCommand);

        // Log the result of the create partition command
        SystemMessages::sysLogMsg(__CLASS__, "$createPartCommand returned $retVal", LOG_INFO);

        // Get the newly created partition name, assuming it's always the first partition after a fresh format
        $partition = self::getDevPartName($device, '1');

        return $this->formatPartition($partition, $bg);
    }

    /**
     * Format a disk locally (part 2) using mkfs command.
     *
     * @param string $partition The partition for format, "/dev/sdb1" or "/dev/nvme0n1p1".
     * @param bool $bg Whether to run the command in the background.
     * @return bool Returns true if the disk formatting process is successfully completed, false otherwise.
     */
    public function formatPartition(string $partition, bool $bg = false): bool
    {
        $mkfs = Util::which("mkfs.ext4");
        $cmd = "$mkfs $partition";
        if ($bg === false) {
            // Execute the mkfs command and check the return value
            $retVal = Processes::mwExec("$cmd 2>&1");
            SystemMessages::sysLogMsg(__CLASS__, "$cmd returned $retVal");
            $result = ($retVal === 0);
        } else {
            usleep(200000);
            // Execute the mkfs command in the background
            Processes::mwExecBg($cmd);
            $result = true;
        }

        return $result;
    }

    /**
     * Get the status of mkfs process on a disk.
     *
     * @param string $dev The device path of the disk.
     * @return string Returns the status of mkfs process ('inprogress' or 'ended').
     */
    public static function statusMkfs(string $dev): string
    {
        if (!file_exists($dev)) {
            $dev = "/dev/$dev";
        }
        $out = [];
        $psPath = Util::which('ps');
        $grepPath = Util::which('grep');

        // Execute the command to check the status of mkfs process
        Processes::mwExec("$psPath -A -f | $grepPath $dev | $grepPath mkfs | $grepPath -v grep", $out);
        $mount_dir = trim(implode('', $out));

        return empty($mount_dir) ? 'ended' : 'inprogress';
    }

    /**
     * Selects the storage disk and performs the necessary configuration.
     *
     * @param bool $automatic Flag to determine if the disk should be selected automatically
     * @param bool $forceFormatStorage Flag to determine if the disk should be formatted
     * @return bool Returns true on success, false otherwise
     */
    public static function selectAndConfigureStorageDisk(bool $automatic=false, bool $forceFormatStorage = false): bool
    {
        $storage = new self();

        // Check if the storage disk is already mounted
        if (self::isStorageDiskMounted()) {
            SystemMessages::echoWithSyslog(PHP_EOL." " . Util::translate('Storage disk is already mounted...') . " ");
            sleep(2);
            return true;
        }

        $validDisks = [];
        // Get all available hard drives
        $all_hdd = $storage->getAllHdd();
        $system_disk = '';
        $selected_disk = ['size' => 0, 'id' => ''];
        // Iterate through all available hard drives
        foreach ($all_hdd as $disk) {
            $additional = '';
            $fourthPartitionName = self::getDevPartName($disk['id'], '4');
            $isLiveCd = ($disk['sys_disk'] && file_exists('/offload/livecd'));
            $isMountedSysDisk = (!empty($disk['mounted']) && $disk['sys_disk'] && file_exists($fourthPartitionName));

            // Check if the disk is a system disk and is mounted
            if ($isMountedSysDisk || $isLiveCd) {
                $system_disk = $disk['id'];
                $additional .= "\033[31;1m [SYSTEM]\033[0m";
            } elseif ($disk['mounted']) {
                // If disk is mounted but not a system disk, continue to the next iteration
                continue;
            }

            // Check if the current disk is larger than the previously selected disk
            if ($selected_disk['size'] === 0 || $disk['size'] > $selected_disk['size']) {
                $selected_disk = $disk;
            }

            $part = $disk['sys_disk'] ? '4' : '1';
            $partitionName = self::getDevPartName($disk['id'], $part);
            if (self::isStorageDisk($partitionName)) {
                $additional .= "\033[33;1m [STORAGE] \033[0m";
            }

            // Check if the disk is a system disk and has a valid partition
           if ($disk['size'] < 2*1024) {
                // If the disk size is less than 2 gb, continue to the next iteration
                continue;
            }

            // Add the valid disk to the validDisks array
            $validDisks[$disk['id']] = "      |- {$disk['id']}, {$disk['size_text']}, {$disk['vendor']}$additional\n";
        }

        if (empty($validDisks)) {
            // If no valid disks were found, log a message and return 0
            $message = '   |- '.Util::translate('Valid disks not found...');
            SystemMessages::echoWithSyslog($message);
            SystemMessages::echoToTeletype(PHP_EOL.$message);
            sleep(3);
            return false;
        }

        // Check if the disk selection should be automatic
        if ($automatic) {
            $target_disk_storage = $selected_disk['id'];
            SystemMessages::echoToTeletype(PHP_EOL.'   - '."Automatically selected storage disk is $target_disk_storage");
        } else {
            echo PHP_EOL." " . Util::translate('Select the drive to store the data.');
            echo PHP_EOL." " . Util::translate('Selected disk:') . "\033[33;1m [{$selected_disk['id']}] \033[0m ".PHP_EOL.PHP_EOL;
            echo(PHP_EOL." " . Util::translate('Valid disks are:') . " ".PHP_EOL.PHP_EOL);
            foreach ($validDisks as $disk) {
                echo($disk);
            }
            echo PHP_EOL;
            // Open standard input in binary mode for interactive reading
            $fp = fopen('php://stdin', 'rb');
            if ($forceFormatStorage){
                echo '*******************************************************************************
* ' . Util::translate('WARNING').'
* - ' . Util::translate('everything on this device will be erased!') . '
* - ' . Util::translate('this cannot be undone!') . '
*******************************************************************************';
            }
            // Otherwise, prompt the user to enter a disk
            do {
                echo PHP_EOL . Util::translate('Enter the device name:') . Util::translate('(default value = ') . $selected_disk['id'] . ') :';
                $target_disk_storage = trim(fgets($fp));
                if ($target_disk_storage === '') {
                    $target_disk_storage = $selected_disk['id'];
                }
            } while (!array_key_exists($target_disk_storage, $validDisks));
        }

        // Determine the disk partition and format if necessary
        $dev_disk = "/dev/$target_disk_storage";
        if (!empty($system_disk) && $system_disk === $target_disk_storage) {
            $part = "4";
        } else {
            $part = "1";
        }
        $partitionName = self::getDevPartName($target_disk_storage, $part);
        if ($part === '1' && (!self::isStorageDisk($partitionName) || $forceFormatStorage)) {
            echo PHP_EOL . Util::translate('Partitioning and formatting storage disk').': '.$dev_disk.'...'.PHP_EOL;
            $storage->formatEntireDisk($dev_disk);
        } elseif($part === '4' && $forceFormatStorage) {
            echo PHP_EOL . Util::translate('Formatting storage partition 4 on disk').': '.$dev_disk.'...'.PHP_EOL;
            passthru("exec </dev/console >/dev/console 2>/dev/console; /sbin/initial_storage_part_four create $dev_disk");
        } elseif($part === '4') {
            echo PHP_EOL . Util::translate('Update storage partition 4 on disk').': '.$dev_disk.'...'.PHP_EOL;
            passthru("exec </dev/console >/dev/console 2>/dev/console; /sbin/initial_storage_part_four update $dev_disk");
        }
        $partitionName = self::getDevPartName($target_disk_storage, $part);
        $uuid = self::getUuid($partitionName);
        // Create an array of disk data
        $data = [
            'device' => $dev_disk,
            'uniqid' => $uuid,
            'filesystemtype' => 'ext4',
            'name' => 'Storage №1'
        ];
        echo PHP_EOL ."Disk part: $dev_disk, uid: $uuid".PHP_EOL;
        // Save the disk settings
        $storage->saveDiskSettings($data);
        if (file_exists('/offload/livecd')) {
            // Do not need to start the PBX, it's the station installation in LiveCD mode.
            return true;
        }
        MainDatabaseProvider::recreateDBConnections();

        // Configure the storage
        $storage->configure();
        MainDatabaseProvider::recreateDBConnections();
        $success = self::isStorageDiskMounted();
        if ($success === true && $automatic) {
            SystemMessages::echoToTeletype(PHP_EOL.'   |- The data storage disk has been successfully mounted ... ');
            sleep(2);
            System::reboot();
            return true;
        }

        if ($automatic) {
            SystemMessages::echoToTeletype(PHP_EOL.'   |- Storage disk was not mounted automatically ... ');
        }

        fclose(STDERR);
        echo('   |- Update database ... ' . PHP_EOL);

        // Update the database
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        $STDERR = fopen('php://stderr', 'wb');
        CdrDb::checkDb();

        // Restart syslog
        $sysLog = new SyslogConf();
        $sysLog->reStart();

        // Configure PBX
        $pbx = new PBX();
        $pbx->configure();

        // Restart processes related to storage
        Processes::processPHPWorker(WorkerApiCommands::class);

        // Check if the disk was mounted successfully
        if ($success === true) {
            SystemMessages::echoWithSyslog( "\n   |- " . Util::translate('Storage disk was mounted successfully...') . " \n\n");
        } else {
            SystemMessages::echoWithSyslog( "\n   |- " . Util::translate('Failed to mount the disc...') . " \n\n");
        }

        sleep(3);
        if ($STDERR!==false){
            fclose($STDERR);
        }

        return $success;
    }

    /**
     * Retrieves the partition name of a device.
     *
     * @param string $dev The device name
     * @param string $part The partition number
     * @param bool $verbose print verbose messages
     * @return string The partition name
     */
    public static function getDevPartName(string $dev, string $part, bool $verbose = false): string
    {
        $lsBlkPath = Util::which('lsblk');
        $cutPath   = Util::which('cut');
        $grepPath  = Util::which('grep');
        $sortPath  = Util::which('sort');

        $basenameDisk = basename($dev);
        $pathToDisk = trim(shell_exec("$lsBlkPath -n -p -a -r -o NAME,TYPE | $grepPath disk | $grepPath '$basenameDisk' | $cutPath -d ' ' -f 1"));
        if($verbose) {
            echo "Get dev full path...".PHP_EOL;
            echo "Source dev: $dev, result full path: $pathToDisk".PHP_EOL;
        }
            // Touch the disk to update disk tables
        $partProbePath = Util::which('partprobe');
        shell_exec($partProbePath." '$pathToDisk'");

        // Touch the disk to update disk tables
        $command = "$lsBlkPath -r -p | $grepPath ' part' | $sortPath -u | $cutPath -d ' ' -f 1 | $grepPath '" . $pathToDisk . "' | $grepPath \"$part\$\"";
        $devName = trim(shell_exec($command));
        if(empty($devName) && $verbose ){
            $verboseMsg = trim(shell_exec("$lsBlkPath -r -p"));
            echo "---   filtered command   ---".PHP_EOL;
            echo $command.PHP_EOL;
            echo "---   result 'lsblk -r -p'   ---".PHP_EOL;
            echo $verboseMsg.PHP_EOL;
            echo "---   ---   ---".PHP_EOL;
        }
        return $devName;
    }

    /**
     * Check if a storage disk is valid.
     *
     * @param string $device The device path of the storage disk.
     * @return bool Returns true if the storage disk is valid, false otherwise.
     */
    public static function isStorageDisk(string $device): bool
    {
        $result = false;
        // Check if the device path exists
        if (!file_exists($device)) {
            return $result;
        }

        $tmp_dir = '/tmp/mnt_' . time();
        Util::mwMkdir($tmp_dir);
        $out = [];

        $uid_part = 'UUID=' . self::getUuid($device);
        $storage = new self();
        $format = $storage->getFsType($device);
        // If the file system type is not available, return false
        if ($format === '') {
            return false;
        }
        $mount = Util::which('mount');
        $umount = Util::which('umount');
        $rm = Util::which('rm');

        Processes::mwExec("$mount -t $format $uid_part $tmp_dir", $out);
        if (is_dir("$tmp_dir/mikopbx") && trim(implode('', $out)) === '') {
            // $out - empty string, no errors
            // mikopbx directory exists
            $result = true;
        }

        // Check if the storage disk is mounted, and unmount if necessary
        if (self::isStorageDiskMounted($device)) {
            Processes::mwExec("$umount $device");
        }

        // Check if the storage disk is unmounted, and remove the temporary directory
        if (!self::isStorageDiskMounted($device)) {
            Processes::mwExec("$rm -rf '$tmp_dir'");
        }

        return $result;
    }

    /**
     * Saves the disk settings to the database.
     *
     * @param array $data The disk settings data to be saved.
     * @param string $id The ID of the disk settings to be updated (default: '1').
     * @return void
     */
    public function saveDiskSettings(array $data, string $id = '1'): void
    {
        $disk_data = $this->getDiskSettings($id);
        if (count($disk_data) === 0) {
            $storage_settings = new StorageModel();
        } else {
            $storage_settings = StorageModel::findFirst("id = '$id'");
        }
        foreach ($data as $key => $value) {
            $storage_settings->writeAttribute($key, $value);
        }
        if(!$storage_settings->save()){
            echo PHP_EOL ."Fail save new storage ID in database...".PHP_EOL;
        }
    }

    /**
     * Retrieves the disk settings from the database.
     *
     * @param string $id The ID of the disk (optional).
     * @return array The disk settings.
     */
    public function getDiskSettings(string $id = ''): array
    {
        $data = [];
        if ('' === $id) {
            // Return all disk settings.
            $data = StorageModel::find()->toArray();
        } else {
            // Return disk settings for the specified ID.
            $pbxSettings = StorageModel::findFirst("id='$id'");
            if ($pbxSettings !== null) {
                $data = $pbxSettings->toArray();
            }
        }

        return $data;
    }

    /**
     * Configures the storage settings.
     */
    public function configure(): void
    {
        $varEtcDir = $this->config->path(Directories::CORE_VAR_ETC_DIR);
        $storage_dev_file = "$varEtcDir/storage_device";
        if (!Util::isT2SdeLinux()) {
            // Configure for non-T2Sde Linux
            file_put_contents($storage_dev_file, "/storage/usbdisk1");
            $this->updateConfigWithNewMountPoint("/storage/usbdisk1");
            $this->createWorkDirs();
            PHPConf::setupLog();
            return;
        }

        $cf_disk = '';

        // Remove the storage_dev_file if it exists
        if (file_exists($storage_dev_file)) {
            unlink($storage_dev_file);
        }

        // Check if cfdevice file exists and get its content
        if (file_exists($varEtcDir . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcDir . '/cfdevice'));
        }

        $disks = $this->getDiskSettings();
        $conf = '';

        // Loop through each disk
        foreach ($disks as $disk) {
            clearstatcache();
            $dev = $this->getStorageDev($disk, $cf_disk);
            // Check if the disk exists
            if (!$this->hddExists($dev)) {
                SystemMessages::sysLogMsg(__METHOD__, "HDD - $dev doesn't exist");
                continue;
            }

            // Check if the disk is marked as media or storage_dev_file doesn't exist
            if ($disk['media'] === '1' || !file_exists($storage_dev_file)) {
                SystemMessages::sysLogMsg(__METHOD__, "Update the storage_dev_file and the mount point configuration");
                file_put_contents($storage_dev_file, "/storage/usbdisk{$disk['id']}");
                $this->updateConfigWithNewMountPoint("/storage/usbdisk{$disk['id']}");
            }

            $formatFs = $this->getFsType($dev);

            // Check if the file system type matches the expected type
            if ($formatFs !== $disk['filesystemtype'] && !($formatFs === 'ext4' && $disk['filesystemtype'] === 'ext2')) {
                SystemMessages::sysLogMsg(__METHOD__, "The file system type has changed {$disk['filesystemtype']} -> $formatFs. The disk will not be connected.");
                continue;
            }
            $str_uid = 'UUID=' . self::getUuid($dev);
            $conf .= "$str_uid /storage/usbdisk{$disk['id']} $formatFs async,rw 0 0\n";
            $mount_point = "/storage/usbdisk{$disk['id']}";
            Util::mwMkdir($mount_point);
            SystemMessages::sysLogMsg(__METHOD__, "Create mount point: $conf");
        }

        // Save the configuration to the fstab file
        $this->saveFstab($conf);

        // Create necessary working directories
        $this->createWorkDirs();

        // Set up the PHP log configuration
        PHPConf::setupLog();
    }

    /**
     * Updates the configuration file with the new mount point.
     *
     * After mount storage we will change /mountpoint/ to new $mount_point value
     *
     * @param string $mount_point The new mount point.
     * @throws Error If the original configuration file has a broken format.
     */
    private function updateConfigWithNewMountPoint(string $mount_point): void
    {
        $settingsFile = '/etc/inc/mikopbx-settings.json';
        $staticSettingsFileOrig = '/etc/inc/mikopbx-settings-orig.json';
        if (!file_exists($staticSettingsFileOrig)) {
            copy($settingsFile, $staticSettingsFileOrig);
        }

        $jsonString = file_get_contents($staticSettingsFileOrig);
        try {
            $data = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new Error("$staticSettingsFileOrig has broken format");
        }
        foreach ($data as $rootKey => $rootEntry) {
            foreach ($rootEntry as $nestedKey => $entry) {
                if (stripos($entry, '/mountpoint') !== false) {
                    $data[$rootKey][$nestedKey] = str_ireplace('/mountpoint', $mount_point, $entry);
                }
            }
        }

        $newJsonString = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents($settingsFile, $newJsonString);
        $this->updateEnvironmentAfterChangeMountPoint();
    }

    /**
     * Updates the environment after changing the mount point.
     * - Recreates the config provider and updates the config variable.
     * - Reloads classes from system and storage disks.
     * - Reloads all providers.
     */
    private function updateEnvironmentAfterChangeMountPoint(): void
    {
        // Update config variable
        ConfigProvider::recreateConfigProvider();
        $this->config = $this->di->getShared(ConfigProvider::SERVICE_NAME);

        // Reload cached values
        Directories::reset();

        // Reload classes from system and storage disks
        ClassLoader::init();

        // Reload all providers
        RegisterDIServices::init();
    }

    /**
     * Creates the necessary working directories and symlinks.
     *
     * @return void
     */
    private function createWorkDirs(): void
    {
        $path = '';
        $mountPath = Util::which('mount');
        Processes::mwExec("$mountPath -o remount,rw /offload 2> /dev/null");

        $isLiveCd = file_exists('/offload/livecd');

        // Create directories
        $arrConfig = $this->config->toArray();
        foreach ($arrConfig as $rootEntry) {
            foreach ($rootEntry as $key => $entry) {
                if (stripos($key, 'path') === false && stripos($key, 'dir') === false) {
                    continue;
                }
                if (file_exists($entry)) {
                    continue;
                }
                if ($isLiveCd && strpos($entry, '/offload/') === 0) {
                    continue;
                }
                $path .= " $entry";
            }
        }

        if (!empty($path)) {
            Util::mwMkdir($path);
        }

        $downloadCacheDir = appPath('sites/pbxcore/files/cache');
        if (!$isLiveCd) {
            Util::mwMkdir($downloadCacheDir);
            Util::createUpdateSymlink($this->config->path('www.downloadCacheDir'), $downloadCacheDir);
        }

        $this->createAssetsSymlinks();
        $this->createViewSymlinks();
        $this->createAGIBINSymlinks($isLiveCd);

        Util::createUpdateSymlink($this->config->path('www.uploadDir'), '/ultmp');

        $filePath = appPath('src/Core/Asterisk/Configs/lua/extensions.lua');
        Util::createUpdateSymlink($filePath, '/etc/asterisk/extensions.lua');

        $this->clearCacheFiles();
        $this->clearTmpFiles();
        $this->applyFolderRights();
        Processes::mwExec("$mountPath -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Clears the cache files for various directories.
     *
     * @return void
     */
    public function clearCacheFiles(): void
    {
        $cacheDirs = [];
        $cacheDirs[] = $this->config->path(Directories::WWW_UPLOAD_DIR);
        $cacheDirs[] = $this->config->path(Directories::WWW_DOWNLOAD_CACHE_DIR);
        $cacheDirs[] = $this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/js';
        $cacheDirs[] = $this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/css';
        $cacheDirs[] = $this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/img';
        $cacheDirs[] = $this->config->path(Directories::APP_VIEW_CACHE_DIR);
        $cacheDirs[] = $this->config->path(Directories::APP_VOLT_CACHE_DIR);
        $rmPath = Util::which('rm');

        // Clear cache files for each directory
        foreach ($cacheDirs as $cacheDir) {
            if (!empty($cacheDir)) {
                Processes::mwExec("$rmPath -rf $cacheDir/*");
            }
        }

        // Delete boot cache folders if storage disk is mounted
        if (is_dir('/mountpoint') && self::isStorageDiskMounted()) {
            Processes::mwExec("$rmPath -rf /mountpoint");
        }
    }

    /**
     * Clear files in temp directories
     * @return void
     */
    private function clearTmpFiles(): void
    {
        $timeout = Util::which('timeout');
        $find = Util::which('find');
        $mv = Util::which('mv');
        $rm = Util::which('rm');
        $nice = Util::which('nice');
        $tmpDir = $this->config->path(Directories::CORE_TEMP_DIR);
        if (!file_exists($tmpDir)) {
            return;
        }
        // Trying to get a list of files
        Processes::mwExec("$timeout 10 $find $tmpDir -type f", $out, $ret);
        if ($ret !== 0) {
            // there are too many files in the temporary directory, we will clear them
            // it may cause a failure when setting access rights (chown)
            $resDirForRm = "$tmpDir-" . time();
            shell_exec("$mv '$tmpDir' '$resDirForRm'");
            if (file_exists("$resDirForRm/swapfile")) {
                // Saving only the swap file
                shell_exec("$mv '$resDirForRm/swapfile' '$tmpDir/swapfile'");
            }
            // Let's start deleting temporary files
            Processes::mwExecBg("$nice -n 19 $rm -rf $resDirForRm");
        }
        Util::mwMkdir($tmpDir, true);
    }

    /**
     * Retrieves the storage device for the given disk.
     *
     * @param array $disk The disk information.
     * @param string $cf_disk The cf_disk information.
     * @return string The storage device path.
     */
    private function getStorageDev(array $disk, string $cf_disk): string
    {
        if (!empty($disk['uniqid']) && strpos($disk['uniqid'], 'STORAGE-DISK') === false) {
            // Find the partition name by UID.
            $lsblk = Util::which('lsblk');
            $grep = Util::which('grep');
            $cut = Util::which('cut');
            $cmd = "$lsblk -r -o NAME,UUID | $grep {$disk['uniqid']} | $cut -d ' ' -f 1";
            $dev = '/dev/' . trim(shell_exec($cmd));
            if ($this->hddExists($dev)) {
                // Disk exists.
                return $dev;
            }
        }
        // Determine the disk by its name.
        if ($disk['device'] !== "/dev/$cf_disk") {
            // If it's a regular disk, use partition 1.
            $part = "1";
        } else {
            // If it's a system disk, attempt to connect partition 4.
            $part = "4";
        }
        return  self::getDevPartName($disk['device'], $part);
    }

    /**
     * Checks if a hard drive exists based on the provided disk identifier.
     *
     * @param string $disk The disk identifier, such as a device path.
     * @return bool Returns true if the disk exists and has a non-empty UUID, false otherwise.
     */
    private function hddExists(string $disk): bool
    {
        // Check if the given disk identifier points to a directory.
        if (is_dir($disk)) {
            SystemMessages::sysLogMsg(__METHOD__, $disk . ' is a dir, not disk', LOG_DEBUG);
            return false;
        }

        // Check if the file corresponding to the disk exists.
        if (!file_exists($disk)) {
            SystemMessages::sysLogMsg(__METHOD__, "Check if the file with name $disk exists failed", LOG_DEBUG);
            return false;
        }

        // Record the start time for timeout purposes.
        $startTime = time();

        // Loop for up to 10 seconds or until a non-empty UUID is found.
        while (true) {
            // Retrieve the UUID for the disk.
            $uid = self::getUuid($disk);
            SystemMessages::sysLogMsg(__METHOD__, "Disk with name $disk has GUID: $uid", LOG_DEBUG);

            // If the UUID is not empty, the disk exists.
            if (!empty($uid)) {
                return true;
            }

            // Exit the loop if 10 seconds have passed.
            if ((time() - $startTime) >= 10) {
                break;
            }

            // Wait for 1 second before the next iteration to avoid high CPU usage.
            sleep(1);
        }

        // If the UUID remains empty after 10 seconds, the disk does not exist.
        return false;
    }

    /**
     * Saves the fstab configuration.
     *
     * @param string $conf Additional configuration to append to fstab
     * @return void
     */
    public function saveFstab(string $conf = ''): void
    {
        $varEtcDir = $this->config->path(Directories::CORE_VAR_ETC_DIR);

        // Create the mount point directory for additional disks
        Util::mwMkdir('/storage');
        $chmodPath = Util::which('chmod');
        Processes::mwExec("$chmodPath 755 /storage");

        // Check if cf device file exists
        if (!file_exists($varEtcDir . '/cfdevice')) {
            return;
        }
        $fstab = '';

        // Read cf device file
        $file_data = file_get_contents($varEtcDir . '/cfdevice');
        $cf_disk = trim($file_data);
        if ('' === $cf_disk) {
            return;
        }
        $part2 = self::getDevPartName($cf_disk, '2');
        $part3 = self::getDevPartName($cf_disk, '3');

        $uid_part2 = 'UUID=' . self::getUuid($part2);
        $format_p2 = $this->getFsType($part2);
        $uid_part3 = 'UUID=' . self::getUuid($part3);
        $format_p3 = $this->getFsType($part3);

        $fstab .= "$uid_part2 /offload $format_p2 ro 0 0\n";
        $fstab .= "$uid_part3 /cf $format_p3 rw 1 1\n";
        $fstab .= $conf;

        // Write fstab file
        file_put_contents("/etc/fstab", $fstab);

        // Duplicate for vm tools d
        file_put_contents("/etc/mtab", $fstab);

        // Mount the file systems
        $mountPath     = Util::which('mount');
        $resultOfMount = Processes::mwExec("$mountPath -a", $out);
        if($resultOfMount !== 0){
            SystemMessages::echoToTeletype(" - Error mount ". implode(' ', $out));
        }
        // Add regular www rights to /cf directory
        Util::addRegularWWWRights('/cf');
    }

    /**
     * Returns candidates to storage
     * @return array
     */
    public function getStorageCandidate(): array
    {
        $disks = $this->getLsBlkDiskInfo();
        $storages = [];
        foreach ($disks as $disk) {
            if ($disk['type'] !== 'disk') {
                continue;
            }
            $children = $disk['children'] ?? [];
            if (count($children) === 0) {
                continue;
            }
            if (count($children) === 1) {
                $part = '1';
            } else {
                $part = '4';
            }

            $dev = '';
            $fs = '';
            foreach ($children as $child) {
                if ($child['fstype'] !== 'ext4' && $child['fstype'] !== 'ext2') {
                    continue;
                }
                if ($disk['name'] . $part === $child['name']) {
                    $dev = '/dev/' . $child['name'];
                    $fs = $child['fstype'];
                    break;
                }
            }
            if (!empty($dev) && !empty($fs)) {
                $storages[$dev] = $fs;
            }
        }

        return $storages;
    }

    /**
     * Get disk information using lsblk command.
     *
     * @return array An array containing disk information.
     */
    private function getLsBlkDiskInfo(): array
    {
        $lsBlkPath = Util::which('lsblk');

        // Execute lsblk command to get disk information in JSON format
        Processes::mwExec(
            "$lsBlkPath -J -b -o VENDOR,MODEL,SERIAL,LABEL,TYPE,FSTYPE,MOUNTPOINT,SUBSYSTEMS,NAME,UUID",
            $out
        );
        try {
            $data = json_decode(implode(PHP_EOL, $out), true, 512, JSON_THROW_ON_ERROR);
            $data = $data['blockdevices'] ?? [];
        } catch (JsonException $e) {
            $data = [];
        }
        return $data;
    }

    /**
     * Create system folders and links after upgrade and connect config DB
     *
     * @return void
     */
    public function createWorkDirsAfterDBUpgrade(): void
    {
        // Remount /offload directory as read-write
        $mountPath = Util::which('mount');
        Processes::mwExec("$mountPath -o remount,rw /offload 2> /dev/null");

        // Create symlinks for module caches
        $this->createModulesCacheSymlinks();

        // Apply folder rights
        $this->applyFolderRights();

        // Remount /offload directory as read-only
        Processes::mwExec("$mountPath -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Creates symlinks for module caches.
     *
     * @return void
     */
    public function createModulesCacheSymlinks(): void
    {
        $modules = PbxExtensionModules::getModulesArray();
        foreach ($modules as $module) {
            // Create cache links for JS, CSS, IMG folders
            PbxExtensionUtils::createAssetsSymlinks($module['uniqid']);

            // Create links for the module view templates
            PbxExtensionUtils::createViewSymlinks($module['uniqid']);

            // Create AGI bin symlinks for the module
            PbxExtensionUtils::createAgiBinSymlinks($module['uniqid']);
        }
    }

    /**
     * Creates symlinks for asset cache directories.
     *
     * @return void
     */
    public function createAssetsSymlinks(): void
    {
        // Create symlink for JS cache directory
        $jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');
        Util::createUpdateSymlink($this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/js', $jsCacheDir);

        // Create symlink for CSS cache directory
        $cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        Util::createUpdateSymlink($this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/css', $cssCacheDir);

        // Create symlink for image cache directory
        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
        Util::createUpdateSymlink($this->config->path(Directories::APP_ASSETS_CACHE_DIR) . '/img', $imgCacheDir);

    }

    /**
     * Creates symlinks for modules view.
     *
     * @return void
     */
    public function createViewSymlinks(): void
    {
        $viewCacheDir = appPath('src/AdminCabinet/Views/Modules');
        Util::createUpdateSymlink($this->config->path(Directories::APP_VIEW_CACHE_DIR), $viewCacheDir);
    }

    /**
     * Creates AGI bin symlinks for extension modules.
     *
     * @param bool $isLiveCd Whether the system loaded on LiveCD mode.
     * @return void
     */
    public function createAGIBINSymlinks(bool $isLiveCd): void
    {
        $agiBinDir = $this->config->path(Directories::AST_AGI_BIN_DIR);
        if ($isLiveCd && strpos($agiBinDir, '/offload/') !== 0) {
            Util::mwMkdir($agiBinDir);
        }

        $roAgiBinFolder = appPath('src/Core/Asterisk/agi-bin');
        $files = glob("$roAgiBinFolder/*.{php}", GLOB_BRACE);
        foreach ($files as $file) {
            $fileInfo = pathinfo($file);
            $newFilename = "$agiBinDir/{$fileInfo['filename']}.{$fileInfo['extension']}";
            Util::createUpdateSymlink($file, $newFilename);
        }
    }

    /**
     * Applies folder rights to the appropriate directories.
     *
     * @return void
     */
    private function applyFolderRights(): void
    {

        $www_dirs = []; // Directories with WWW rights
        $exec_dirs = []; // Directories with executable rights

        $arrConfig = $this->config->toArray();

        // Get the directories for WWW rights from the configuration
        foreach ($arrConfig as $key => $entry) {
            if (in_array($key, ['www', 'adminApplication'])) {
                foreach ($entry as $subKey => $subEntry) {
                    if (stripos($subKey, 'path') === false && stripos($subKey, 'dir') === false) {
                        continue;
                    }
                    $www_dirs[] = $subEntry;
                }
            }
        }

        // Add additional directories with WWW rights
        $www_dirs[] = $this->config->path(Directories::CORE_TEMP_DIR);
        $www_dirs[] = $this->config->path(Directories::CORE_LOGS_DIR);

        // Create empty log files with WWW rights
        $logFiles = [
            $this->config->path('database.debugLogFile'),
            $this->config->path('cdrDatabase.debugLogFile'),
        ];

        foreach ($logFiles as $logFile) {
            $filename = (string)$logFile;
            if (!file_exists($filename)) {
                file_put_contents($filename, '');
            }
            $www_dirs[] = $filename;
        }

        $www_dirs[] = '/etc/version';
        $www_dirs[] = appPath('/');

        // Add read rights to the directories
        Util::addRegularWWWRights(implode(' ', $www_dirs));

        // Add executable rights to the directories
        $exec_dirs[] = appPath('src/Core/Asterisk/agi-bin');
        $exec_dirs[] = appPath('src/Core/Rc');
        Util::addExecutableRights(implode(' ', $exec_dirs));

        $mountPath = Util::which('mount');
        Processes::mwExec("$mountPath -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Mounts the swap file.
     */
    public function mountSwap(): void
    {
        $tempDir = $this->config->path(Directories::CORE_TEMP_DIR);
        $swapFile = "$tempDir/swapfile";

        $swapOffCmd = Util::which('swapoff');
        Processes::mwExec("$swapOffCmd $swapFile");

        $this->makeSwapFile($swapFile);
        if (!file_exists($swapFile)) {
            return;
        }
        $swapOnCmd = Util::which('swapon');
        $result = Processes::mwExec("$swapOnCmd $swapFile");
        SystemMessages::sysLogMsg('Swap', 'connect swap result: ' . $result, LOG_INFO);
    }

    /**
     * Creates a swap file.
     *
     * @param string $swapFile The path to the swap file.
     */
    private function makeSwapFile(string $swapFile): void
    {
        $swapLabel = Util::which('swaplabel');

        // Check if swap file already exists
        if (Processes::mwExec("$swapLabel $swapFile") === 0) {
            return;
        }
        if (file_exists($swapFile)) {
            unlink($swapFile);
        }

        $size = $this->getStorageFreeSpaceMb();
        if ($size > 2000) {
            $swapSize = 1024;
        } elseif ($size > 1000) {
            $swapSize = 512;
        } else {
            // Not enough free space.
            return;
        }
        $bs = 1024;
        $countBlock = $swapSize * (1024 * 1024) / $bs;
        $ddCmd = Util::which('dd');

        SystemMessages::sysLogMsg('Swap', 'make swap ' . $swapFile, LOG_INFO);

        // Create swap file using dd command
        Processes::mwExec("$ddCmd if=/dev/zero of=$swapFile bs=$bs count=$countBlock");

        $mkSwapCmd = Util::which('mkswap');

        // Set up swap space on the file
        Processes::mwExec("$mkSwapCmd $swapFile");
    }

    /**
     * Retrieves the amount of free storage space in megabytes.
     *
     * @return int The amount of free storage space in megabytes.
     */
    public function getStorageFreeSpaceMb(): int
    {
        $size = 0;
        $mntDir = '';
        $mounted = self::isStorageDiskMounted('', $mntDir);
        if (!$mounted) {
            return 0;
        }
        $hd = $this->getAllHdd(true);
        foreach ($hd as $disk) {
            if ($disk['mounted'] === $mntDir) {
                $size = $disk['free_space'];
                break;
            }
        }
        return $size;
    }

    /**
     * Get information about all HDD devices.
     *
     * @param bool $mounted_only Whether to include only mounted devices.
     * @return array An array of HDD device information.
     */
    public function getAllHdd(bool $mounted_only = false): array
    {
        $res_disks = [];

        if (Util::isDocker()) {

            // Get disk information for /storage directory
            $out = [];
            $grepPath = Util::which('grep');
            $dfPath = Util::which('df');
            $awkPath = Util::which('awk');

            // Execute the command to get disk information for /storage directory
            Processes::mwExec(
                "$dfPath -k /storage | $awkPath  '{ print \$1 \"|\" $3 \"|\" \$4} ' | $grepPath -v 'Available'",
                $out
            );
            $disk_data = explode('|', implode(" ", $out));
            if (count($disk_data) === 3) {
                $m_size = round(($disk_data[1] + $disk_data[2]) / 1024, 1);

                // Add Docker disk information to the result
                $res_disks[] = [
                    'id' => $disk_data[0],
                    'size' => "" . $m_size,
                    'size_text' => "" . $m_size . " Mb",
                    'vendor' => 'Debian',
                    'mounted' => '/storage/usbdisk',
                    'free_space' => round($disk_data[2] / 1024, 1),
                    'partitions' => [],
                    'sys_disk' => true,
                ];
            }

            return $res_disks;
        }

        // Get CD-ROM and HDD devices
        $cd_disks = $this->cdromGetDevices();
        $disks    = $this->diskGetDevices();

        $cf_disk = '';
        $varEtcDir = $this->config->path(Directories::CORE_VAR_ETC_DIR);

        if (file_exists($varEtcDir . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcDir . '/cfdevice'));
        }

        foreach ($disks as $disk => $diskInfo) {
            $type = $diskInfo['fstype'] ?? '';

            // Skip Linux RAID member disks
            if ($type === 'linux_raid_member') {
                continue;
            }

            // Skip CD-ROM disks
            if (in_array($disk, $cd_disks, true)) {
                continue;
            }
            unset($temp_vendor, $temp_size, $original_size);
            $mounted = self::diskIsMounted($disk);
            if ($mounted_only === true && $mounted === false) {
                continue;
            }
            $sys_disk = ($cf_disk === $disk);

            $mb_size = 0;
            if (is_file("/sys/block/" . $disk . "/size")) {
                $original_size = trim(file_get_contents("/sys/block/" . $disk . "/size"));
                $original_size = ($original_size * 512 / 1024 / 1024);
                $mb_size = round($original_size, 1);
            }
            if ($mb_size > 100) {
                $temp_size = sprintf("%.0f MB", $mb_size);
                $temp_vendor = $this->getVendorDisk($diskInfo);
                $free_space = self::getFreeSpace($disk);

                $arr_disk_info = $this->determineFormatFs($diskInfo);

                if (count($arr_disk_info) > 0) {
                    $used = 0;
                    foreach ($arr_disk_info as $disk_info) {
                        $used += $disk_info['used_space'];
                    }
                    if ($used > 0) {
                        $free_space = $mb_size - $used;
                    }
                }

                // Add HDD device information to the result
                $res_disks[] = [
                    'id' => $disk,
                    'size' => $mb_size,
                    'size_text' => $temp_size,
                    'vendor' => $temp_vendor,
                    'mounted' => $mounted,
                    'free_space' => round($free_space, 1),
                    'partitions' => $arr_disk_info,
                    'sys_disk' => $sys_disk,
                ];
            }
        }
        return $res_disks;
    }

    /**
     * Get CD-ROM devices.
     *
     * @return array An array of CD-ROM device names.
     */
    private function cdromGetDevices(): array
    {
        $disks = [];
        $blockDevices = $this->getLsBlkDiskInfo();
        foreach ($blockDevices as $diskData) {
            $type = $diskData['type'] ?? '';
            $name = $diskData['name'] ?? '';

            // Skip devices that are not CD-ROM
            if ($type !== 'rom' || $name === '') {
                continue;
            }
            $disks[] = $name;
        }
        return $disks;
    }

    /**
     * Get disk devices.
     *
     * @param bool $diskOnly Whether to include only disk devices.
     * @return array An array of disk device information.
     */
    public function diskGetDevices(bool $diskOnly = false): array
    {
        $disks = [];
        $blockDevices = $this->getLsBlkDiskInfo();

        foreach ($blockDevices as $diskData) {
            $type = $diskData['type'] ?? '';
            $name = $diskData['name'] ?? '';
            if ($type !== 'disk' || $name === '') {
                continue;
            }
            $disks[$name] = $diskData;
            if ($diskOnly === true) {
                continue;
            }
            $children = $diskData['children'] ?? [];

            foreach ($children as $child) {
                $childName = $child['name'] ?? '';
                if ($childName === '') {
                    continue;
                }
                $disks[$childName] = $child;
            }
        }
        return $disks;
    }

    /**
     * Check if a disk is mounted.
     *
     * @param string $disk The name of the disk.
     * @param string $filter The filter to match the disk name.
     * @return string|bool The mount point if the disk is mounted, or false if not mounted.
     */
    public static function diskIsMounted(string $disk, string $filter = '/dev/')
    {
        $out = [];
        $grepPath = Util::which('grep');
        $mountPath = Util::which('mount');
        $headPath = Util::which('head');

        // Execute mount command and grep the output for the disk name
        Processes::mwExec("$mountPath | $grepPath '$filter${disk}' | $headPath -n 1", $out);
        if (count($out) > 0) {
            $res_out = end($out);
        } else {
            $res_out = implode('', $out);
        }
        $data = explode(' ', trim($res_out));

        return (count($data) > 2) ? $data[2] : false;
    }

    /**
     * Get the vendor name for a disk.
     *
     * @param array $diskInfo The disk information.
     * @return string The vendor name.
     */
    private function getVendorDisk(array $diskInfo): string
    {
        $temp_vendor = [];
        $keys = ['vendor', 'model', 'type'];

        // Iterate through the keys to retrieve vendor-related data
        foreach ($keys as $key) {
            $data = $diskInfo[$key] ?? '';
            if ($data !== '') {
                $temp_vendor[] = trim(str_replace(',', '', $data));
            }
        }

        // If no vendor-related data is found, use the disk name
        if (empty($temp_vendor)) {
            $temp_vendor[] = $diskInfo['name'] ?? 'ERROR: NoName';
        }
        return implode(', ', $temp_vendor);
    }

    /**
     * Get the free space in megabytes for a given HDD.
     *
     * @param string $hdd The name of the HDD.
     * @return int The free space in megabytes.
     */
    public static function getFreeSpace(string $hdd)
    {
        $out = [];
        $hdd = escapeshellarg($hdd);
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $df = Util::which('df');
        $head = Util::which('head');

        // Execute df command to get the free space for the HDD
        Processes::mwExec("$df -m | $grep $hdd | $grep -v custom_modules | $head -n 1 | $awk '{print $4}'", $out);
        $result = 0;

        // Sum up the free space values
        foreach ($out as $res) {
            if (!is_numeric($res)) {
                continue;
            }
            $result += (1 * $res);
        }

        return $result;
    }

    /**
     * Determine the format and file system information for a device.
     *
     * @param array $deviceInfo The device information.
     * @return array An array containing format and file system information for each device partition.
     */
    public function determineFormatFs(array $deviceInfo): array
    {
        $allow_formats = ['ext2', 'ext4', 'fat', 'ntfs', 'msdos'];
        $device = basename($deviceInfo['name'] ?? '');

        $devices = $this->getDiskParted('/dev/' . $deviceInfo['name'] ?? '');
        $result_data = [];

        // Iterate through each device partition
        foreach ($devices as $dev) {
            if (empty($dev) || (count($devices) > 1 && $device === $dev) || is_dir("/sys/block/$dev")) {
                continue;
            }
            $mb_size = 0;
            $path_size_info = '';
            $tmp_path = "/sys/block/$device/$dev/size";
            if (file_exists($tmp_path)) {
                $path_size_info = $tmp_path;
            }

            // If the size path is not found, try an alternate path
            if (empty($path_size_info)) {
                $tmp_path = "/sys/block/" . substr($dev, 0, 3) . "/$dev/size";
                if (file_exists($tmp_path)) {
                    $path_size_info = $tmp_path;
                }
            }

            // Calculate the size in megabytes
            if (!empty($path_size_info)) {
                $original_size = trim(file_get_contents($path_size_info));
                $original_size = ($original_size * 512 / 1024 / 1024);
                $mb_size = $original_size;
            }

            $tmp_dir = "/tmp/{$dev}_" . time();
            $out = [];

            $fs = null;
            $need_unmount = false;
            $mount_dir = '';

            // Check if the device is currently mounted
            if (self::isStorageDiskMounted("/dev/$dev ", $mount_dir)) {
                $grepPath = Util::which('grep');
                $awkPath = Util::which('awk');
                $mountPath = Util::which('mount');

                // Get the file system type and free space of the mounted device
                Processes::mwExec("$mountPath | $grepPath '/dev/$dev' | $awkPath '{print $5}'", $out);
                $fs = trim(implode("", $out));
                $fs = ($fs === 'fuseblk') ? 'ntfs' : $fs;
                $free_space = self::getFreeSpace("/dev/$dev ");
                $used_space = $mb_size - $free_space;
            } else {
                $format = $this->getFsType($device);

                // Check if the detected format is allowed
                if (in_array($format, $allow_formats)) {
                    $fs = $format;
                }

                // Mount the device and determine the used space
                self::mountDisk($dev, $format, $tmp_dir);

                $need_unmount = true;
                $used_space = Util::getSizeOfFile($tmp_dir);
            }

            // Store the partition information in the result array
            $result_data[] = [
                "dev" => $dev,
                'size' => round($mb_size, 2),
                "used_space" => round($used_space, 2),
                "free_space" => round($mb_size - $used_space, 2),
                "uuid" => self::getUuid("/dev/$dev "),
                "fs" => $fs,
            ];

            // Unmount the temporary mount point if needed
            if ($need_unmount) {
                self::umountDisk($tmp_dir);
            }
        }

        return $result_data;
    }

    /**
     * Get the disk partitions using the lsblk command.
     *
     * @param string $diskName The name of the disk.
     * @return array An array of disk partition names.
     */
    private function getDiskParted(string $diskName): array
    {
        $result = [];
        $lsBlkPath = Util::which('lsblk');

        // Execute lsblk command to get disk partition information in JSON format
        Processes::mwExec("$lsBlkPath -J -b -o NAME,TYPE $diskName", $out);

        try {
            $data = json_decode(implode(PHP_EOL, $out), true, 512, JSON_THROW_ON_ERROR);
            $data = $data['blockdevices'][0] ?? [];
        } catch (\JsonException $e) {
            $data = [];
        }

        $type = $data['children'][0]['type'] ?? '';

        // Check if the disk is not a RAID type
        if (strpos($type, 'raid') === false) {
            $children = $data['children'] ?? [];
            foreach ($children as $child) {
                $result[] = $child['name'];
            }
        }

        return $result;
    }

    /**
     * Get the file system type of a device.
     *
     * @param string $device The device path.
     * @return string The file system type of the device.
     */
    public function getFsType(string $device): string
    {
        $blkid = Util::which('blkid');
        $sed = Util::which('sed');
        $grep = Util::which('grep');
        $awk = Util::which('awk');

        // Remove '/dev/' from the device path
        $device = str_replace('/dev/', '', $device);
        $out = [];

        // Execute the command to retrieve the file system type of the device
        Processes::mwExec(
            "$blkid -ofull /dev/$device | $sed -r 's/[[:alnum:]]+=/\\n&/g' | $grep \"^TYPE=\" | $awk -F \"\\\"\" '{print $2}'",
            $out
        );
        $format = implode('', $out);

        // Check if the format is 'msdosvfat' and replace it with 'msdos'
        if ($format === 'msdosvfat') {
            $format = 'msdos';
        }

        return $format;
    }

    /**
     * Mount a disk to a directory.
     *
     * @param string $dev The device name.
     * @param string $format The file system format.
     * @param string $dir The directory to mount the disk.
     * @return bool True if the disk was successfully mounted, false otherwise.
     */
    public static function mountDisk(string $dev, string $format, string $dir): bool
    {
        // Check if the disk is already mounted
        if (self::isStorageDiskMounted("/dev/$dev ")) {
            return true;
        }

        // Create the directory if it doesn't exist
        Util::mwMkdir($dir);

        // Check if the directory was created successfully
        if (!file_exists($dir)) {
            SystemMessages::sysLogMsg(__Method__, "Unable mount $dev $format to $dir. Unable create dir.");

            return false;
        }

        // Remove the '/dev/' prefix from the device name
        $dev = str_replace('/dev/', '', $dev);

        if ('ntfs' === $format) {
            // Mount NTFS disk using 'mount.ntfs-3g' command
            $mountNtfs3gPath = Util::which('mount.ntfs-3g');
            Processes::mwExec("$mountNtfs3gPath /dev/$dev $dir", $out);
        } else {
            // Mount disk using specified file system format and UUID
            $uid_part = 'UUID=' . self::getUuid("/dev/$dev");
            $mountPath = Util::which('mount');
            Processes::mwExec("$mountPath -t $format $uid_part $dir", $out);
        }

        // Check if the disk is now mounted
        return self::isStorageDiskMounted("/dev/$dev ");
    }

    /**
     * Get the UUID (Universally Unique Identifier) of a device.
     *
     * @param string $device The device path.
     * @return string The UUID of the device.
     */
    public static function getUuid(string $device): string
    {
        if (empty($device)) {
            return '';
        }
        $lsblk = Util::which('lsblk');
        $grep = Util::which('grep');
        $cut = Util::which('cut');

        // Build the command to retrieve the UUID of the device
        $cmd = "$lsblk -r -o NAME,UUID | $grep " . basename($device) . " | $cut -d ' ' -f 2";
        $res = Processes::mwExec($cmd, $output);
        if ($res === 0 && !empty($output)) {
            $result = $output[0];
        } else {
            $result = '';
        }
        return $result;
    }

    /**
     * Retrieves the name of the disk used for recovery. (conf.recover.)
     *
     * @return string The name of the recovery disk (e.g., '/dev/sda').
     */
    public function getRecoverDiskName(): string
    {
        $disks = $this->diskGetDevices(true);
        foreach ($disks as $disk => $diskInfo) {
            // Check if the disk is a RAID or virtual device
            if (isset($diskInfo['children'][0]['children'])) {
                $diskInfo = $diskInfo['children'][0];
                // Adjust the disk name for RAID or other virtual devices
                $disk = $diskInfo['name'];
            }
            foreach ($diskInfo['children'] as $child) {
                $mountpoint = $child['mountpoint'] ?? '';
                $diskPath = "/dev/$disk";
                if ($mountpoint === '/conf.recover' && file_exists($diskPath)) {
                    return "/dev/$disk";
                }
            }
        }
        return '';
    }

    /**
     * Returns the monitor directory path.
     * @deprecated Use Directories class instead
     *
     * @return string The monitor directory path.
     */
    public static function getMonitorDir(): string
    {
        return Directories::getDir(Directories::AST_MONITOR_DIR);
    }

    /**
     * Connect storage in a cloud if it was provisioned but not connected.
     *
     * @return string connection result
     */
    public static function connectStorageInCloud(): string
    {
        if (PbxSettings::findFirst('key="' . PbxSettingsConstants::CLOUD_PROVISIONING . '"') === null) {
            return SystemMessages::RESULT_SKIPPED;
        }

        // In some Clouds the virtual machine starts immediately before the storage disk was attached
        if (!self::selectAndConfigureStorageDisk(true)){
            return SystemMessages::RESULT_FAILED;
        }

        return SystemMessages::RESULT_DONE;
    }
}
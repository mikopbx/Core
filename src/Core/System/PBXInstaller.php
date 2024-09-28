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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Config\Config;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Class PBXInstaller
 * Handles the installation of MikoPBX onto a selected drive
 * @package MikoPBX\Core\System
 */
class PBXInstaller extends Injectable
{
    /**
     * Access to the /etc/inc/mikopbx-settings.json values
     *
     * @var \Phalcon\Config\Config
     */
    private Config $config;

    private array $valid_disks = [];
    private array $selected_disk = ['size' => 0, 'id' => ''];
    private string $target_disk = '';

    // File pointer
    private $fp;

    /**
     * PBXInstaller constructor.
     * Initiates the installation process.
     */
    public function __construct()
    {

        $this->config = Di::getDefault()->getShared(ConfigProvider::SERVICE_NAME);

        $this->fp = fopen('php://stdin', 'rb');

    }

    /**
     * Initiates the installation steps.
     */
    public function run(): void
    {
        $this->scanAllHdd();
        if ($this->processValidDisks()){
            $this->promptForTargetDisk();
            if ($this->confirmInstallation()) {
                $this->proceedInstallation();
            }
        }
    }

    /**
     * Scans all connected HDDs.
     */
    private function scanAllHdd(): void
    {
        $storage = new Storage();
        $all_hdd = $storage->getAllHdd();
        foreach ($all_hdd as $disk) {
            $this->processDisk($disk);
        }
    }

    /**
     * Process each disk and save valid ones.
     *
     * @param array $disk Information about the disk
     */
    private function processDisk(array $disk): void
    {
        // Initialize a variable to hold additional info
        $other_info = '';

        // Add info if the disk is a system disk or is mounted
        if (true === $disk['sys_disk']) {
            $other_info .= ' System Disk ';
        }
        if (true === $disk['mounted']) {
            $other_info .= ' Mounted ';
        }

        // Add a visual effect to the additional info if it's not empty
        if ($other_info !== '') {
            $other_info = "[ \033[31;1m$other_info\033[0m ]";
        }

        // Update the selected disk if the current disk's size is smaller
        if ($this->selected_disk['size'] === 0 || $this->selected_disk['size'] > $disk['size']) {
            $this->selected_disk = $disk;
        }

        // Ignore disks that are less than 400 megabytes
        if ($disk['size'] < 400) {
            return;
        }

        // Add the disk to the list of valid disks
        $this->valid_disks[$disk['id']] = "  - {$disk['id']}, {$disk['size_text']}, {$disk['vendor']} $other_info \n";
    }

    /**
     * Process the valid disks and select one for installation.
     */
    private function processValidDisks(): bool
    {
        // If no valid disks were found, print a message and sleep for 3 seconds, then return 0
        if (count($this->valid_disks) === 0) {
            SystemMessages::echoWithSyslog(PHP_EOL." " . Util::translate('Valid disks not found...') . " ".PHP_EOL);
            sleep(3);
            return false;
        }

        // If valid disks were found, print prompts for the user to select a disk
        echo "\n " . Util::translate('Select the drive to install the system.') . ' ';
        echo "\n " . Util::translate('Selected disk:') . "\033[33;1m [{$this->selected_disk['id']}] \033[0m \n\n";
        echo "\n " . Util::translate('Valid disks are:') . " \n\n";

        // Print each valid disk
        foreach ($this->valid_disks as $disk) {
            echo $disk;
        }
        echo "\n";
        return true;
    }

    /**
     * Prompt the user to select a target disk.
     *
     * @return void The selected disk id
     */
    private function promptForTargetDisk(): void
    {
        // Prompt the user to enter a device name until a valid device name is entered
        do {
            echo "\n" . Util::translate('Enter the device name:') . Util::translate('(default value = ') . $this->selected_disk['id'] . ') :';
            $this->target_disk = trim(fgets($this->fp));
            if ($this->target_disk === '') {
                $this->target_disk = $this->selected_disk['id'];
            }
        } while (!array_key_exists($this->target_disk, $this->valid_disks));

    }

    /**
     * Confirm the installation from the user.
     */
    private function confirmInstallation(): bool
    {
        // Warning and confirmation prompt
        echo '

*******************************************************************************
* ' . Util::translate('WARNING') . '!
* ' . Util::translate('The PBX is about to be installed onto the') . " \033[33;1m$this->target_disk\033[0m.
* - " . Util::translate('everything on this device will be erased!') . '
* - ' . Util::translate('this cannot be undone!') . '
*******************************************************************************

' . Util::translate('The PBX will reboot after installation.') . '

' . Util::translate('Do you want to proceed? (y/n): ');

        // If the user doesn't confirm, save the system disk info to a temp file and exit
        if (strtolower(trim(fgets($this->fp))) !== 'y') {
            sleep(3);
            return false;
        }

        return true;
    }

    /**
     * Start the installation process.
     */
    private function proceedInstallation(): void
    {
        // Save the target disk to a file
        $varEtcDir = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
        file_put_contents($varEtcDir . '/cfdevice', $this->target_disk);

        // Start the installation process
        echo Util::translate("Installing PBX...").PHP_EOL;
        $this->unmountPartitions();
        $this->unpackImage();
        $this->mountStorage();
        $this->copyConfiguration();

        // Reboot
        file_put_contents('/tmp/ejectcd', '');
        System::reboot();
    }

    /**
     * Unmount the partitions of the selected disk.
     */
    private function unmountPartitions(): void
    {
        echo Util::translate(" - Unmounting partitions...").PHP_EOL;
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $mount = Util::which('mount');
        $umount = Util::which('umount');

        // Get all mounted partitions
        $mnt_dirs = [];
        Processes::mwExec("$mount | $grep '^/dev/$this->target_disk' | $awk '{print $3}'", $mnt_dirs);
        foreach ($mnt_dirs as $mnt) {
            // Terminate all related processes.
            Processes::mwExec("/sbin/shell_functions.sh killprocesses '$mnt' -TERM 0;");
            // Unmount.
            Processes::mwExec("$umount $mnt");
        }
    }

    /**
     * Unpack the image to the target disk.
     */
    private function unpackImage(): void
    {
        echo Util::translate(" - Unpacking img...").PHP_EOL;
        $pv = Util::which('pv');
        $dd = Util::which('dd');
        $gunzip = Util::which('gunzip');

        $install_cmd = 'exec < /dev/console > /dev/console 2>/dev/console;' .
            "$pv -p /offload/firmware.img.gz | $gunzip | $dd of=/dev/$this->target_disk bs=4M 2> /dev/null";
        passthru($install_cmd);
    }

    /**
     * Mount the storage partition.
     */
    private function mountStorage(): void
    {
        // Connect the disk for data storage.
        Storage::selectAndConfigureStorageDisk(false,true);
    }

    /**
     * Copy the configuration to the target disk.
     */
    private function copyConfiguration():void
    {
        // Back up the table with disk information.
        echo Util::translate("Copying configuration...").PHP_EOL;
        Util::mwMkdir('/mnttmp');

        echo "Target disk: $this->target_disk ...".PHP_EOL;
        $confPartitionName = Storage::getDevPartName($this->target_disk, '3', true);
        if(empty($confPartitionName)){
            echo "Target partition not found: $this->target_disk (part 3) ...".PHP_EOL;
            return;
        }
        // Mount the disk with settings.
        $mount  = Util::which('mount');
        $umount = Util::which('umount');
        $resUMount = Processes::mwExec("$umount $confPartitionName");
        echo "Umount $confPartitionName: $resUMount ...".PHP_EOL;
        $resMount = Processes::mwExec("$mount -w -o noatime $confPartitionName /mnttmp");
        echo "Mount $confPartitionName to /mnttmp: $resMount ...".PHP_EOL;
        $filename = $this->config->path('database.dbfile');
        $result_db_file = '/mnttmp/conf/mikopbx.db';

        /** Copy the settings database file. */
        $cp = Util::which('cp');
        $sqlite3 = Util::which('sqlite3');
        $dmpDbFile = tempnam('/tmp', 'storage');
        // Save dump of settings.
        $tables = ['m_Storage', 'm_LanInterfaces'];
        file_put_contents($dmpDbFile, '');
        foreach ($tables as $table) {
            echo "DUMP $table from /cf/conf/mikopbx.db ...".PHP_EOL;
            $res = shell_exec("sqlite3 /cf/conf/mikopbx.db '.schema $table' >> $dmpDbFile");
            $res .= shell_exec("sqlite3 /cf/conf/mikopbx.db '.dump $table' >> $dmpDbFile");
            echo "$res ...".PHP_EOL;
        }
        // If another language is selected - use another settings file.
        $lang = PbxSettings::getValueByKey(PbxSettings::SSH_LANGUAGE);
        $filename_lang = "/offload/conf/mikopbx-$lang.db";
        if ($lang !== 'en' && file_exists($filename_lang)) {
            $filename = $filename_lang;
        }
        // Replace the settings file.
        $resCopy = Processes::mwExec("$cp $filename $result_db_file");
        echo "Copy $filename to $result_db_file: $resCopy ...".PHP_EOL;
        foreach ($tables as $table) {
            echo "DROP $table IF EXISTS in $result_db_file ...".PHP_EOL;
            $res = shell_exec("$sqlite3 $result_db_file 'DROP TABLE IF EXISTS $table'");
            echo "$res ...".PHP_EOL;
        }
        // Restore settings from backup file.
        $resSaveSettings = Processes::mwExec("$sqlite3 $result_db_file < $dmpDbFile");
        echo "Save settings to $result_db_file. Result: $resSaveSettings ...".PHP_EOL;
        unlink($dmpDbFile);
        Processes::mwExec("$umount /mnttmp");
    }
}
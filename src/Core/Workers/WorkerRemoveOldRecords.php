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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\{Processes, Storage, Util};

/**
 * WorkerRemoveOldRecords is a worker class responsible for cleaning monitor records.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerRemoveOldRecords extends WorkerBase
{
    private const MIN_SPACE_MB = 500;
    public const MIN_SPACE_MB_ALERT = 200;

    /**
     * Starts the worker and checks disk space. Sends notifications in case of problems.
     *
     * @param mixed $params The parameters.
     * @return void
     */
    public function start(array $params): void
    {
        $storage = new Storage();
        $hdd = $storage->getAllHdd(true);

        // Check disk space for each disk
        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true && !Storage::isStorageDiskMounted("{$disk['id']}4")) {

                // Skip the system disk (4th partition) if it's not mounted
                continue;
            }
            [$need_alert, $need_clean, $test_alert] = $this->check($disk);
            if ($need_alert) {
                Util::sysLogMsg("STORAGE", $test_alert);
            }
            if ($need_clean) {
                $this->cleanStorage();
            }
        }
    }

    /**
     * Checks the disk space and determines if an alert or cleanup is needed.
     *
     * @param array $disk The disk information.
     * @return array The result of the check: [need_alert, need_clean, test_alert].
     */
    private function check(array $disk): array
    {
        $need_alert = false;
        $need_clean = false;
        $test_alert = '';
        if ($disk['free_space'] < self::MIN_SPACE_MB_ALERT) {
            $need_alert = true;
            $test_alert = "The {$disk['id']} has less than " . self::MIN_SPACE_MB . 'MB of free space available.';
            $need_clean = true;
        }
        return array($need_alert, $need_clean, $test_alert);
    }

    /**
     * Cleans up storage when disk space is low.
     *
     * @return void
     */
    private function cleanStorage(): void
    {
        $varEtcDir = $this->di->getShared('config')->path('core.varEtcDir');
        $filename = "{$varEtcDir}/storage_device";
        if (file_exists($filename)) {
            $mount_point = file_get_contents($filename);
        } else {
            return;
        }
        $out = [];
        $busyboxPath = Util::which('busybox');
        $mountPath = Util::which('mount');
        $grepPath = Util::which('grep');
        $headPath = Util::which('head');
        $sortPath = Util::which('sort');
        $findPath = Util::which('find');
        $awkPath = Util::which('awk');

        // Get the device for the mount point
        Processes::mwExec("{$mountPath} | {$busyboxPath} {$grepPath} {$mount_point} | {$busyboxPath} {$awkPath} '{print $1}' | {$headPath} -n 1", $out);
        $dev = implode('', $out);

        $s = new Storage();
        $free_space = $s->getFreeSpace($dev);
        if ($free_space > self::MIN_SPACE_MB) {
            // Disk cleanup is not required
            return;
        }
        $monitor_dir = Storage::getMonitorDir();
        $out = [];

        // Get the oldest directories in the monitor directory
        Processes::mwExec(
            "{$findPath} {$monitor_dir}/*/*/*  -maxdepth 0 -type d  -printf '%T+ %p\n' 2> /dev/null | {$sortPath} | {$headPath} -n 10 | {$busyboxPath} {$awkPath} '{print $2}'",
            $out
        );
        $busyboxPath = Util::which('busybox');
        $rmPath = Util::which('rm');

        foreach ($out as $dir_info) {
            if (!is_dir($dir_info)) {
                continue;
            }
            $free_space = $s->getFreeSpace($dev);
            if ($free_space > self::MIN_SPACE_MB) {
                // Disk cleanup is not required
                break;
            }
            Processes::mwExec("{$busyboxPath} {$rmPath} -rf {$dir_info}");
        }
    }
}

// Start worker process
WorkerRemoveOldRecords::startWorker($argv ?? []);
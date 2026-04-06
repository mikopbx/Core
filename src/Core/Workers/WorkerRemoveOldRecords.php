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

use MikoPBX\Core\System\{Directories, Processes, RecordingDeletionLogger, Storage, SystemMessages, Util};

/**
 * WorkerRemoveOldRecords is a worker class responsible for cleaning monitor records.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerRemoveOldRecords extends WorkerBase
{
    private const int MIN_SPACE_MB = 500;
    public const int MIN_SPACE_MB_ALERT = 500;

    /**
     * Starts the worker and checks disk space. Sends notifications in case of problems.
     *
     * @param mixed $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $storage = new Storage();
        $hdd = $storage->getAllHdd(true);

        // Check disk space for each disk
        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true) {
                $storagePartition = "{$disk['id']}4";
                if (!Storage::isStorageDiskMounted($storagePartition)) {
                    // Skip the system disk if the 4th partition is not mounted as storage
                    continue;
                }
                // On single-disk systems, getAllHdd reports free_space from the first
                // mounted partition (offload/vda2), not from storage (vda4).
                // Use the actual storage partition free space for the alert check.
                $disk['free_space'] = Storage::getFreeSpace($storagePartition);
            }
            [$need_alert, $need_clean, $test_alert] = $this->check($disk);
            if ($need_alert) {
                SystemMessages::sysLogMsg("STORAGE", $test_alert);
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
        $filename = "$varEtcDir/storage_device";
        if (file_exists($filename)) {
            $mount_point = trim(file_get_contents($filename));
        } else {
            return;
        }

        $free_space = Storage::getFreeSpace($mount_point);
        if ($free_space > self::MIN_SPACE_MB) {
            return;
        }
        $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $out = [];
        $head = Util::which('head');
        $sort = Util::which('sort');
        $find = Util::which('find');
        $awk = Util::which('awk');

        Processes::mwExec(
            "$find $monitor_dir/*/*/*  -maxdepth 0 -type d  -printf '%T+ %p\n' 2> /dev/null | $sort | $head -n 10 | $awk '{print $2}'",
            $out
        );
        $rm = Util::which('rm');

        foreach ($out as $dir_info) {
            if (!is_dir($dir_info)) {
                continue;
            }
            $free_space = Storage::getFreeSpace($mount_point);
            if ($free_space > self::MIN_SPACE_MB) {
                break;
            }
            // Log each recording file before removing the directory
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir_info, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    RecordingDeletionLogger::log(
                        RecordingDeletionLogger::DISK_CLEANUP,
                        $file->getPathname(),
                        "free_space={$free_space}MB"
                    );
                }
            }
            Processes::mwExec("$rm -rf $dir_info");
        }
    }
}

// Start a worker process
WorkerRemoveOldRecords::startWorker($argv ?? []);

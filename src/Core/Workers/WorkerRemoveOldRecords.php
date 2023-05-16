<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

class WorkerRemoveOldRecords extends WorkerBase
{
    private const MIN_SPACE_MB = 500;
    private const MIN_SPACE_MB_ALERT = 200;

    /**
     * Проверка свободного места на дисках. Уведомление в случае проблем.
     * @param mixed $params
     */
    public function start($params): void
    {
        $util = new Util();
        $storage = new Storage();
        $hdd  = $storage->getAllHdd(true);
        // Создание больщого файла для тестов.
        // head -c 1500MB /dev/urandom > /storage/usbdisk1/big_file.mp3
        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true && ! Storage::isStorageDiskMounted("{$disk['id']}4")) {
                // Это системный диск (4ый раздел). Он не смонтирован.
                continue;
            }
            [$need_alert, $need_clean, $test_alert] = $this->check($disk);
            if ($need_alert) {
                Util::sysLogMsg("STORAGE", $test_alert);
                $data = [
                    'Device     - ' => "/dev/{$disk['id']}",
                    'Directoire - ' => $disk['mounted'],
                    'Desciption - ' => $test_alert,
                ];
                // Добавляем задачу на уведомление.
                $util->addJobToBeanstalk('WorkerNotifyError_storage', $data);
            }
            if($need_clean){
                $this->cleanStorage();
            }
        }
    }

    private function cleanStorage():void
    {
        $varEtcDir = $this->di->getShared('config')->path('core.varEtcDir');
        $filename   = "{$varEtcDir}/storage_device";
        if (file_exists($filename)) {
            $mount_point = file_get_contents($filename);
        } else {
            return;
        }
        $out = [];
        $busyboxPath = Util::which('busybox');
        $mountPath   = Util::which('mount');
        $grepPath    = Util::which('grep');
        $headPath    = Util::which('head');
        $sortPath    = Util::which('sort');
        $findPath    = Util::which('find');
        $awkPath     = Util::which('awk');

        Processes::mwExec("{$mountPath} | {$busyboxPath} {$grepPath} {$mount_point} | {$busyboxPath} {$awkPath} '{print $1}' | {$headPath} -n 1", $out);
        $dev = implode('', $out);

        $s          = new Storage();
        $free_space = $s->getFreeSpace($dev);
        if ($free_space > self::MIN_SPACE_MB) {
            // Очистка диска не требуется.
            return;
        }
        $monitor_dir = Storage::getMonitorDir();
        $out         = [];
        Processes::mwExec(
            "{$findPath} {$monitor_dir}/*/*/*  -maxdepth 0 -type d  -printf '%T+ %p\n' 2> /dev/null | {$sortPath} | {$headPath} -n 10 | {$busyboxPath} {$awkPath} '{print $2}'",
            $out
        );
        $busyboxPath = Util::which('busybox');
        $rmPath      = Util::which('rm');

        foreach ($out as $dir_info) {
            if ( ! is_dir($dir_info)) {
                continue;
            }
            $free_space = $s->getFreeSpace($dev);
            if ($free_space > self::MIN_SPACE_MB) {
                // Очистка диска не требуется.
                break;
            }
            Processes::mwExec("{$busyboxPath} {$rmPath} -rf {$dir_info}");
        }
    }

    /**
     * @param $disk
     * @return array
     */
    private function check($disk): array{
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
}

// Start worker process
WorkerRemoveOldRecords::startWorker($argv??null);
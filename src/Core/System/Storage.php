<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use Phalcon\Di;

use function MikoPBX\Common\Config\appPath;


/**
 * Class Storage
 *
 * @package MikoPBX\Core\System
 * @property \Phalcon\Config config
 */
class Storage extends Di\Injectable
{
    /**
     * Возвращает директорию для хранения файлов записей разговоров.
     *
     * @return string
     */
    public static function getMonitorDir(): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getConfig()->path('asterisk.monitordir');
        }

        return '/tmp';
    }

    /**
     * Возвращает директорию для хранения media файлов.
     *
     * @return string
     */
    public static function getMediaDir(): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getConfig()->path('core.mediaMountPoint');
        }

        return '/tmp';
    }


    /**
     * Прверяем является ли диск хранилищем.
     *
     * @param $device
     *
     * @return bool
     */
    public static function isStorageDisk($device): bool
    {
        $result = false;
        if (!file_exists($device)) {
            return $result;
        }

        $tmp_dir = '/tmp/mnt_' . time();
        Util::mwMkdir($tmp_dir);
        $out = [];

        $storage = new self();
        $uid_part = 'UUID=' . $storage->getUuid($device) . '';
        $format = $storage->getFsType($device);
        if ($format === '') {
            return false;
        }
        $mountPath = Util::which('mount');
        $umountPath = Util::which('umount');
        $rmPath = Util::which('rm');

        Processes::mwExec("{$mountPath} -t {$format} {$uid_part} {$tmp_dir}", $out);
        if (is_dir("{$tmp_dir}/mikopbx") && trim(implode('', $out)) === '') {
            // $out - пустая строка, ошибок нет
            // присутствует каталог mikopbx.
            $result = true;
        }
        if (self::isStorageDiskMounted($device)) {
            Processes::mwExec("{$umountPath} {$device}");
        }

        if (!self::isStorageDiskMounted($device)) {
            Processes::mwExec("{$rmPath} -rf '{$tmp_dir}'");
        }

        return $result;
    }

    /**
     * Получение идентификатора устройства.
     *
     * @param $device
     *
     * @return string
     */
    public function getUuid($device): string
    {
        if (empty($device)) {
            return '';
        }
        $lsBlkPath = Util::which('lsblk');
        $busyboxPath = Util::which('busybox');

        $cmd = "{$lsBlkPath} -r -o NAME,UUID | {$busyboxPath} grep " . basename($device) . " | {$busyboxPath} cut -d ' ' -f 2";
        $res = Processes::mwExec($cmd, $output);
        if ($res === 0 && count($output) > 0) {
            $result = $output[0];
        } else {
            $result = '';
        }

        return $result;
    }

    /**
     * Возвращает тип файловой системы блочного устройства.
     *
     * @param $device
     *
     * @return string
     */
    public function getFsType($device): string
    {
        $blkidPath = Util::which('blkid');
        $busyboxPath = Util::which('busybox');
        $sedPath = Util::which('sed');
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');

        $device = str_replace('/dev/', '', $device);
        $out = [];
        Processes::mwExec(
            "{$blkidPath} -ofull /dev/{$device} | {$busyboxPath} {$sedPath} -r 's/[[:alnum:]]+=/\\n&/g' | {$busyboxPath} {$grepPath} \"^TYPE=\" | {$busyboxPath} {$awkPath} -F \"\\\"\" '{print $2}'",
            $out
        );
        $format = implode('', $out);
        if ($format === 'msdosvfat') {
            $format = 'msdos';
        }

        return $format;
    }

    /**
     * Moves predefined sound files to storage disk
     * Changes SoundFiles records
     */
    public static function moveReadOnlySoundsToStorage(): void
    {
        if(!self::isStorageDiskMounted()) {
            return;
        }
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $currentMediaDir = $di->getConfig()->path('asterisk.customSoundDir') . '/';
        if ( !file_exists($currentMediaDir)) {
            Util::mwMkdir($currentMediaDir);
        }
        $soundFiles = SoundFiles::find();
        foreach ($soundFiles as $soundFile) {
            if (stripos($soundFile->path, '/offload/asterisk/sounds/other/') === 0) {
                $newPath = $currentMediaDir.pathinfo($soundFile->path)['basename'];
                if (copy($soundFile->path, $newPath)) {
                    SystemManagementProcessor::convertAudioFile($newPath);
                    $soundFile->path = Util::trimExtensionForFile($newPath) . ".mp3";
                    if(file_exists($soundFile->path)){
                        $soundFile->update();
                    }
                }
            }
        }
        unset($soundFiles);
    }

    /**
     * Copies MOH sound files to storage and creates record on SoundFiles table
     */
    public static function copyMohFilesToStorage(): void
    {
        if(!self::isStorageDiskMounted()) {
            return;
        }
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $config        = $di->getConfig();
        $oldMohDir     = $config->path('asterisk.astvarlibdir') . '/sounds/moh';
        $currentMohDir = $config->path('asterisk.mohdir');
        if ( ! file_exists($oldMohDir)||Util::mwMkdir($currentMohDir)) {
            return;
        }
        $files = scandir($oldMohDir);
        foreach ($files as $file) {
            if (in_array($file, ['.', '..'])) {
                continue;
            }
            if (copy($oldMohDir.'/'.$file, $currentMohDir.'/'.$file)) {
                $sound_file           = new SoundFiles();
                $sound_file->path     = $currentMohDir . '/' . $file;
                $sound_file->category = SoundFiles::CATEGORY_MOH;
                $sound_file->name     = $file;
                $sound_file->save();
            }
        }
    }

    /**
     * Проверка, смонтирован ли диск - хранилище.
     *
     * @param string $filter
     * @param string $mount_dir
     *
     * @return bool
     */
    public static function isStorageDiskMounted($filter = '', &$mount_dir = ''): bool
    {
        if (Util::isSystemctl() && file_exists('/storage/usbdisk1/')) {
            $mount_dir = '/storage/usbdisk1/';
            return true;
        }
        if ('' === $filter) {
            $di = Di::getDefault();
            if ($di !== null) {
                $varEtcDir = $di->getConfig()->path('core.varEtcDir');
            } else {
                $varEtcDir = '/var/etc';
            }

            $filename = "{$varEtcDir}/storage_device";
            if (file_exists($filename)) {
                $filter = file_get_contents($filename);
            } else {
                $filter = 'usbdisk1';
            }
        }
        $filter = escapeshellarg($filter);

        $out = [];
        $grepPath = Util::which('grep');
        $mountPath = Util::which('mount');
        $awkPath = Util::which('awk');
        Processes::mwExec("{$mountPath} | {$grepPath} {$filter} | {$awkPath} '{print $3}'", $out);
        $mount_dir = trim(implode('', $out));

        return ($mount_dir !== '');
    }

    /**
     * Монитирование каталога с удаленного сервера SFTP.
     *
     * @param        $host
     * @param int    $port
     * @param string $user
     * @param string $pass
     * @param string $remout_dir
     * @param string $local_dir
     *
     * @return bool
     */
    public static function mountSftpDisk($host, $port, $user, $pass, $remout_dir, $local_dir): bool
    {
        Util::mwMkdir($local_dir);

        $out = [];
        $timeoutPath = Util::which('timeout');
        $sshfsPath = Util::which('sshfs');

        $command = "{$timeoutPath} 3 {$sshfsPath} -p {$port} -o nonempty -o password_stdin -o 'StrictHostKeyChecking=no' " . "{$user}@{$host}:{$remout_dir} {$local_dir} << EOF\n" . "{$pass}\n" . "EOF\n";
        // file_put_contents('/tmp/sshfs_'.$host, $command);
        Processes::mwExec($command, $out);
        $response = trim(implode('', $out));
        if ('Terminated' == $response) {
            // Удаленный сервер не ответил / или не корректно указан пароль.
            unset($response);
        }

        return self::isStorageDiskMounted("$local_dir ");
    }

    /**
     * Монитирование каталога с удаленного сервера FTP.
     *
     * @param        $host
     * @param        $port
     * @param        $user
     * @param        $pass
     * @param string $remout_dir
     * @param        $local_dir
     *
     * @return bool
     */
    public static function mountFtp($host, $port, $user, $pass, $remout_dir, $local_dir): bool
    {
        Util::mwMkdir($local_dir);
        $out = [];

        // Собираем строку подключения к ftp.
        $auth_line = '';
        if (!empty($user)) {
            $auth_line .= 'user="' . $user;
            if (!empty($pass)) {
                $auth_line .= ":{$pass}";
            }
            $auth_line .= '",';
        }

        $connect_line = 'ftp://' . $host;
        if (!empty($port)) {
            $connect_line .= ":{$port}";
        }
        if (!empty($remout_dir)) {
            $connect_line .= "$remout_dir";
        }

        $timeoutPath = Util::which('timeout');
        $curlftpfsPath = Util::which('curlftpfs');
        $command = "{$timeoutPath} 3 {$curlftpfsPath}  -o allow_other -o {$auth_line}fsname={$host} {$connect_line} {$local_dir}";
        Processes::mwExec($command, $out);
        $response = trim(implode('', $out));
        if ('Terminated' === $response) {
            // Удаленный сервер не ответил / или не корректно указан пароль.
            unset($response);
        }

        return self::isStorageDiskMounted("$local_dir ");
    }

    /**
     * Запускает процесс форматирования диска.
     *
     * @param $dev
     *
     * @return array|bool
     */
    public static function mkfs_disk($dev)
    {
        if (!file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        if (!file_exists($dev)) {
            return false;
        }
        $dir = '';
        self::isStorageDiskMounted($dev, $dir);

        if (empty($dir) || self::umountDisk($dir)) {
            // Диск размонтирован.
            $st = new Storage();
            // Будет запущен процесс:
            $st->formatDiskLocal($dev, true);
            sleep(1);

            return (self::statusMkfs($dev) === 'inprogress');
        }

        // Ошибка размонтирования диска.
        return false;
    }

    /**
     * Размонтирует диск. Удаляет каталог в случае успеха.
     *
     * @param $dir
     *
     * @return bool
     */
    public static function umountDisk($dir): bool
    {
        $umountPath = Util::which('umount');
        $rmPath     = Util::which('rm');
        if (self::isStorageDiskMounted($dir)) {
            Processes::mwExec("/sbin/shell_functions.sh 'killprocesses' '$dir' -TERM 0");
            Processes::mwExec("{$umountPath} {$dir}");
        }
        $result = ! self::isStorageDiskMounted($dir);
        if ($result && file_exists($dir)) {
            // Если диск не смонтирован, то удаляем каталог.
            Processes::mwExec("{$rmPath} -rf '{$dir}'");
        }

        return $result;
    }

    /**
     * Разметка диска.
     *
     * @param string $device
     * @param bool   $bg
     *
     * @return mixed
     */
    public function formatDiskLocal($device, $bg = false)
    {
        $partedPath = Util::which('parted');
        $retVal = Processes::mwExec(
            "{$partedPath} --script --align optimal '{$device}' 'mklabel msdos mkpart primary ext4 0% 100%'"
        );
        Util::sysLogMsg(__CLASS__, "{$partedPath} returned {$retVal}");
        if (false === $bg) {
            sleep(1);
        }

        return $this->formatDiskLocalPart2($device, $bg);
    }

    /**
     * Форматирование диска.
     *
     * @param string $device
     * @param bool   $bg
     *
     * @return mixed
     */
    private function formatDiskLocalPart2($device, $bg = false): bool
    {
        if (is_numeric(substr($device, -1))) {
            $device_id = "";
        } else {
            $device_id = "1";
        }
        $format = 'ext4';
        $mkfsPath = Util::which("mkfs.{$format}");
        $cmd = "{$mkfsPath} {$device}{$device_id}";
        if ($bg === false) {
            $retVal = (Processes::mwExec("{$cmd} 2>&1") === 0);
            Util::sysLogMsg(__CLASS__, "{$mkfsPath} returned {$retVal}");
        } else {
            usleep(200000);
            Processes::mwExecBg($cmd);
            $retVal = true;
        }

        return $retVal;
    }

    /**
     * Возвращает текущий статус форматирования диска.
     *
     * @param $dev
     *
     * @return string
     */
    public static function statusMkfs($dev): string
    {
        if (!file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        $out = [];
        $psPath = Util::which('ps');
        $grepPath = Util::which('grep');
        Processes::mwExec("{$psPath} -A -f | {$grepPath} {$dev} | {$grepPath} mkfs | {$grepPath} -v grep", $out);
        $mount_dir = trim(implode('', $out));

        return empty($mount_dir) ? 'ended' : 'inprogress';
    }

    /**
     * Clear cache folders from PHP sessions files
     */
    public static function clearSessionsFiles(): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $config = $di->getShared('config');
        $phpSessionDir = $config->path('www.phpSessionDir');
        if (!empty($phpSessionDir)) {
            $rmPath = Util::which('rm');
            Processes::mwExec("{$rmPath} -rf {$phpSessionDir}/*");
        }
    }

    /**
     * Возвращает все подключенные HDD.
     *
     * @param bool $mounted_only
     *
     * @return array
     */
    public function getAllHdd($mounted_only = false): array
    {
        $res_disks = [];

        if (Util::isSystemctl()) {
            $out = [];
            $grepPath = Util::which('grep');
            $dfPath = Util::which('df');
            $awkPath = Util::which('awk');
            Processes::mwExec(
                "{$dfPath} -k /storage/usbdisk1 | {$awkPath}  '{ print $1 \"|\" $3 \"|\" $4} ' | {$grepPath} -v 'Available'",
                $out
            );
            $disk_data = explode('|', implode(" ", $out));
            if (count($disk_data) === 3) {
                $m_size = round(($disk_data[1] + $disk_data[2]) / 1024, 1);
                $res_disks[] = [
                    'id' => $disk_data[0],
                    'size' => "" . $m_size,
                    'size_text' => "" . $m_size . " Mb",
                    'vendor' => 'Debian',
                    'mounted' => '/storage/usbdisk1',
                    'free_space' => round($disk_data[2] / 1024, 1),
                    'partitions' => [],
                    'sys_disk' => true,
                ];
            }

            return $res_disks;
        }

        $cd_disks   = $this->cdromGetDevices();
        $disks      = $this->diskGetDevices();

        $cf_disk = '';
        $varEtcDir = $this->config->path('core.varEtcDir');

        if (file_exists($varEtcDir . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcDir . '/cfdevice'));
        }

        foreach ($disks as $disk => $diskInfo) {
            $type = $diskInfo['fstype']??'';
            if($type === 'linux_raid_member'){
                continue;
            }
            if (in_array($disk, $cd_disks, true)) {
                // Это CD-ROM.
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
                $mb_size = $original_size;
            }
            if ($mb_size > 100) {
                $temp_size   = sprintf("%.0f MB", $mb_size);
                $temp_vendor = $this->getVendorDisk($diskInfo);
                $free_space  = $this->getFreeSpace($disk);

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

                $res_disks[] = [
                    'id' => $disk,
                    'size' => $mb_size,
                    'size_text' => $temp_size,
                    'vendor' => $temp_vendor,
                    'mounted' => $mounted,
                    'free_space' => $free_space,
                    'partitions' => $arr_disk_info,
                    'sys_disk' => $sys_disk,
                ];
            }
        }
        return $res_disks;
    }

    /**
     * Получение массива подключенныйх cdrom.
     *
     * @return array
     */
    private function cdromGetDevices(): array
    {
        $disks = [];
        $blockDevices = $this->getLsBlkDiskInfo();
        foreach ($blockDevices as $diskData) {
            $type = $diskData['type'] ?? '';
            $name = $diskData['name'] ?? '';
            if ($type !== 'rom' || $name === '') {
                continue;
            }
            $disks[] = $name;
        }
        return $disks;
    }

    /**
     * Получение массива подключенныйх HDD.
     * @param false $diskOnly
     * @return array
     */
    public function diskGetDevices($diskOnly = false): array
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
     * Возвращает информацию о дисках.
     * @return array
     */
    private function getLsBlkDiskInfo(): array
    {
        $lsBlkPath = Util::which('lsblk');
        Processes::mwExec(
            "{$lsBlkPath} -J -b -o VENDOR,MODEL,SERIAL,LABEL,TYPE,FSTYPE,MOUNTPOINT,SUBSYSTEMS,NAME,UUID",
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
     * Проверка, смонтирован ли диск.
     *
     * @param $disk
     * @param $filter
     *
     * @return string|bool
     */
    public static function diskIsMounted($disk, $filter = '/dev/')
    {
        $out = [];
        $grepPath = Util::which('grep');
        $mountPath = Util::which('mount');
        Processes::mwExec("{$mountPath} | {$grepPath} '{$filter}{$disk}'", $out);
        if (count($out) > 0) {
            $res_out = end($out);
        } else {
            $res_out = implode('', $out);
        }
        $data = explode(' ', trim($res_out));

        return (count($data) > 2) ? $data[2] : false;
    }

    /**
     * Получение сведений по диску.
     *
     * @param $diskInfo
     *
     * @return string
     */
    private function getVendorDisk($diskInfo): string
    {
        $temp_vendor = [];
        $keys = ['vendor', 'model', 'type'];
        foreach ($keys as $key) {
            $data = $diskInfo[$key] ?? '';
            if ($data !== '') {
                $temp_vendor[] = trim(str_replace(',', '', $data));
            }
        }
        if (count($temp_vendor) === 0) {
            $temp_vendor[] = $diskInfo['name'] ?? 'ERROR: NoName';
        }
        return implode(', ', $temp_vendor);
    }

    /**
     * Получаем свободное место на диске в Mb.
     *
     * @param $hdd
     *
     * @return mixed
     */
    public function getFreeSpace($hdd)
    {
        $out = [];
        $hdd = escapeshellarg($hdd);
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        $dfPath = Util::which('df');
        Processes::mwExec("{$dfPath} -m | {$grepPath} {$hdd} | {$awkPath} '{print $4}'", $out);
        $result = 0;
        foreach ($out as $res) {
            if (!is_numeric($res)) {
                continue;
            }
            $result += (1 * $res);
        }

        return $result;
    }

    private function getDiskParted($diskName): array
    {
        $result = [];
        $lsBlkPath = Util::which('lsblk');
        Processes::mwExec("{$lsBlkPath} -J -b -o NAME,TYPE {$diskName}", $out);
        try {
            $data = json_decode(implode(PHP_EOL, $out), true, 512, JSON_THROW_ON_ERROR);
            $data = $data['blockdevices'][0] ?? [];
        } catch (\JsonException $e) {
            $data = [];
        }

        $type = $data['children'][0]['type'] ?? '';
        if (strpos($type, 'raid') === false) {
            $children = $data['children']??[];
            foreach ($children as $child) {
                $result[] = $child['name'];
            }
        }

        return $result;
    }

    /**
     * Определить формат файловой системы и размер дисков.
     *
     * @param $deviceInfo
     *
     * @return array|bool
     */
    public function determineFormatFs($deviceInfo)
    {
        $allow_formats = ['ext2', 'ext4', 'fat', 'ntfs', 'msdos'];
        $device = basename($deviceInfo['name'] ?? '');

        $devices = $this->getDiskParted('/dev/'.$deviceInfo['name'] ?? '');
        $result_data = [];
        foreach ($devices as $dev) {
            if (empty($dev) || (count($devices) > 1 && $device === $dev) || is_dir("/sys/block/{$dev}")) {
                continue;
            }
            $mb_size = 0;
            $path_size_info = '';
            $tmp_path = "/sys/block/{$device}/{$dev}/size";
            if (file_exists($tmp_path)) {
                $path_size_info = $tmp_path;
            }
            if (empty($path_size_info)) {
                $tmp_path = "/sys/block/" . substr($dev, 0, 3) . "/{$dev}/size";
                if (file_exists($tmp_path)) {
                    $path_size_info = $tmp_path;
                }
            }

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
            if (self::isStorageDiskMounted("/dev/{$dev} ", $mount_dir)) {
                $grepPath = Util::which('grep');
                $awkPath = Util::which('awk');
                $mountPath = Util::which('mount');
                Processes::mwExec("{$mountPath} | {$grepPath} '/dev/{$dev}' | {$awkPath} '{print $5}'", $out);
                $fs = trim(implode("", $out));
                $fs = ($fs === 'fuseblk') ? 'ntfs' : $fs;
                $free_space = $this->getFreeSpace("/dev/{$dev} ");
                $used_space = $mb_size - $free_space;
            } else {
                $format = $this->getFsType($device);
                if (in_array($format, $allow_formats)) {
                    $fs = $format;
                }
                self::mountDisk($dev, $format, $tmp_dir);

                $need_unmount = true;
                $used_space = Util::getSizeOfFile($tmp_dir);
            }
            $result_data[] = [
                "dev" => $dev,
                'size' => round($mb_size, 2),
                "used_space" => round($used_space, 2),
                "free_space" => round($mb_size - $used_space, 2),
                "uuid" => $this->getUuid("/dev/{$dev} "),
                "fs" => $fs,
            ];
            if ($need_unmount) {
                self::umountDisk($tmp_dir);
            }
        }

        return $result_data;
    }

    /**
     * Монтирует диск в указанный каталог.
     *
     * @param $dev
     * @param $format
     * @param $dir
     *
     * @return bool
     */
    public static function mountDisk($dev, $format, $dir): bool
    {
        if (self::isStorageDiskMounted("/dev/{$dev} ")) {
            return true;
        }
        Util::mwMkdir($dir);

        if (!file_exists($dir)) {
            Util::sysLogMsg('Storage', "Unable mount $dev $format to $dir. Unable create dir.");

            return false;
        }
        $dev = str_replace('/dev/', '', $dev);
        if ('ntfs' === $format) {
            $mountNtfs3gPath = Util::which('mount.ntfs-3g');
            Processes::mwExec("{$mountNtfs3gPath} /dev/{$dev} {$dir}", $out);
        } else {
            $storage = new self();
            $uid_part = 'UUID=' . $storage->getUuid("/dev/{$dev}") . '';
            $mountPath = Util::which('mount');
            Processes::mwExec("{$mountPath} -t {$format} {$uid_part} {$dir}", $out);
        }

        return self::isStorageDiskMounted("/dev/{$dev} ");
    }

    /**
     * Монтирование разделов диска с базой данных настроек.
     */
    public function configure(): void
    {
        if(Util::isSystemctl()){
            $this->updateConfigWithNewMountPoint("/storage/usbdisk1");
            $this->createWorkDirs();
            PHPConf::setupLog();
            return;
        }

        $cf_disk = '';
        $varEtcDir = $this->config->path('core.varEtcDir');
        $storage_dev_file = "{$varEtcDir}/storage_device";
        if (file_exists($storage_dev_file)) {
            unlink($storage_dev_file);
        }

        if (file_exists($varEtcDir . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcDir . '/cfdevice'));
        }
        $disks = $this->getDiskSettings();
        $conf = '';
        foreach ($disks as $disk) {
            clearstatcache();
            if ($disk['device'] !== "/dev/{$cf_disk}") {
                // Если это обычный диск, то раздел 1.
                $part = "1";
            } else {
                // Если это системный диск, то пытаемся подключить раздел 4.
                $part = "4";
            }
            $devName = self::getDevPartName($disk['device'], $part);
            $dev = '/dev/' . $devName;
            if (!$this->hddExists($dev)) {
                // Диск не существует.
                continue;
            }
            if ($disk['media'] === '1' || !file_exists($storage_dev_file)) {
                file_put_contents($storage_dev_file, "/storage/usbdisk{$disk['id']}");
                $this->updateConfigWithNewMountPoint("/storage/usbdisk{$disk['id']}");
            }
            $formatFs = $this->getFsType($dev);
            if($formatFs !== $disk['filesystemtype'] && !($formatFs === 'ext4' && $disk['filesystemtype'] === 'ext2')){
                Util::sysLogMsg('Storage', "The file system type has changed {$disk['filesystemtype']} -> {$formatFs}. The disk will not be connected.");
                continue;
            }
            $str_uid = 'UUID=' . $this->getUuid($dev) . '';
            $conf .= "{$str_uid} /storage/usbdisk{$disk['id']} {$formatFs} async,rw 0 0\n";
            $mount_point = "/storage/usbdisk{$disk['id']}";
            Util::mwMkdir($mount_point);
        }
        $this->saveFstab($conf);
        $this->createWorkDirs();
        PHPConf::setupLog();
    }

    /**
     * Получаем настройки диска из базы данных.
     *
     * @param string $id
     *
     * @return array
     */
    public function getDiskSettings($id = ''): array
    {
        $data = [];
        if ('' === $id) {
            // Возвращаем данные до модификации.
            $data = StorageModel::find()->toArray();
        } else {
            $pbxSettings = StorageModel::findFirst("id='$id'");
            if ($pbxSettings !== null) {
                $data = $pbxSettings->toArray();
            }
        }

        return $data;
    }

    /**
     * Проверяет, существует ли диск в массиве.
     *
     * @param $disk
     *
     * @return bool
     */
    private function hddExists($disk): bool
    {
        $result = false;
        $uid = $this->getUuid($disk);
        if ($uid !== false && file_exists($disk)) {
            $result = true;
        }
        return $result;
    }

    /**
     * After mount storage we will change /mountpoint/ to new $mount_point value
     *
     * @param string $mount_point
     *
     */
    private function updateConfigWithNewMountPoint(string $mount_point): void
    {
        $staticSettingsFile = '/etc/inc/mikopbx-settings.json';
        $staticSettingsFileOrig = appPath('config/mikopbx-settings.json');

        $jsonString = file_get_contents($staticSettingsFileOrig);
        try {
            $data = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new Error("{$staticSettingsFileOrig} has broken format");
        }
        foreach ($data as $rootKey => $rootEntry) {
            foreach ($rootEntry as $nestedKey => $entry) {
                if (stripos($entry, '/mountpoint') !== false) {
                    $data[$rootKey][$nestedKey] = str_ireplace('/mountpoint', $mount_point, $entry);
                }
            }
        }

        $newJsonString = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents($staticSettingsFile, $newJsonString);
        $this->updateEnvironmentAfterChangeMountPoint();
    }


    /**
     * Recreates DI services and reloads config from JSON file
     *
     */
    private function updateEnvironmentAfterChangeMountPoint(): void
    {
        // Update config variable
        ConfigProvider::recreateConfigProvider();
        $this->config = $this->di->get('config');

        // Reload classes from system and storage disks
        ClassLoader::init();

        // Reload all providers
        RegisterDIServices::init();
    }

    /**
     * Generates fstab file
     * Mounts volumes
     *
     * @param string $conf
     */
    public function saveFstab($conf = ''): void
    {
        if(Util::isSystemctl()){
            // Не настраиваем.
            return;
        }

        $varEtcDir = $this->config->path('core.varEtcDir');
        // Точка монтирования доп. дисков.
        Util::mwMkdir('/storage');
        $chmodPath = Util::which('chmod');
        Processes::mwExec("{$chmodPath} 755 /storage");
        if (!file_exists($varEtcDir . '/cfdevice')) {
            return;
        }
        $fstab = '';
        $file_data = file_get_contents($varEtcDir . '/cfdevice');
        $cf_disk = trim($file_data);
        if ('' === $cf_disk) {
            return;
        }
        $part2 = self::getDevPartName($cf_disk, '2');
        $part3 = self::getDevPartName($cf_disk, '3');

        $uid_part2 = 'UUID=' . $this->getUuid("/dev/{$part2}");
        $format_p2 = $this->getFsType($part2);
        $uid_part3 = 'UUID=' . $this->getUuid("/dev/{$part3}");
        $format_p3 = $this->getFsType($part3);

        $fstab .= "{$uid_part2} /offload {$format_p2} ro 0 0\n";
        $fstab .= "{$uid_part3} /cf {$format_p3} rw 1 1\n";
        $fstab .= $conf;

        file_put_contents("/etc/fstab", $fstab);
        // Дублируем для работы vmtoolsd.
        file_put_contents("/etc/mtab", $fstab);
        $mountPath = Util::which('mount');
        Processes::mwExec("{$mountPath} -a 2> /dev/null");
        Util::addRegularWWWRights('/cf');
    }

    /**
     * Возвращает имя раздела диска по имени и номеру.
     * @param string $dev
     * @param string $part
     * @return string
     */
    public static function getDevPartName(string $dev, string $part): string
    {
        $lsBlkPath = Util::which('lsblk');
        $cutPath = Util::which('cut');
        $grepPath = Util::which('grep');
        $sortPath = Util::which('sort');

        $command = "{$lsBlkPath} -r | {$grepPath} ' part' | {$sortPath} -u | {$cutPath} -d ' ' -f 1 | {$grepPath} \"" . basename(
                $dev
            ) . "\" | {$grepPath} \"{$part}\$\"";
        Processes::mwExec($command, $out);
        $devName = trim(implode('', $out));
        return trim($devName);
    }

    /**
     * Creates system folders according to config file
     *
     * @return void
     */
    private function createWorkDirs(): void
    {
        $path = '';
        $mountPath = Util::which('mount');
        Processes::mwExec("{$mountPath} -o remount,rw /offload 2> /dev/null");

        $isLiveCd = file_exists('/offload/livecd');
        // Create dirs
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

        Util::createUpdateSymlink($this->config->path('www.phpSessionDir'), '/var/lib/php/session');
        Util::createUpdateSymlink($this->config->path('www.uploadDir'), '/ultmp');

        $filePath = appPath('src/Core/Asterisk/Configs/lua/extensions.lua');
        Util::createUpdateSymlink($filePath, '/etc/asterisk/extensions.lua');

        // Create symlinks to AGI-BIN
        $agiBinDir = $this->config->path('asterisk.astagidir');
        if ($isLiveCd && strpos($agiBinDir, '/offload/') !== 0) {
            Util::mwMkdir($agiBinDir);
        }

        $roAgiBinFolder = appPath('src/Core/Asterisk/agi-bin');
        $files = glob("{$roAgiBinFolder}/*.{php}", GLOB_BRACE);
        foreach ($files as $file) {
            $fileInfo = pathinfo($file);
            $newFilename = "{$agiBinDir}/{$fileInfo['filename']}.{$fileInfo['extension']}";
            Util::createUpdateSymlink($file, $newFilename);
        }
        $this->clearCacheFiles();
        $this->applyFolderRights();
        Processes::mwExec("{$mountPath} -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Creates JS, CSS, IMG cache folders and links
     *
     */
    public function createAssetsSymlinks(): void
    {
        $jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.assetsCacheDir') . '/js', $jsCacheDir);

        $cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.assetsCacheDir') . '/css', $cssCacheDir);

        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.assetsCacheDir') . '/img', $imgCacheDir);
    }

    /**
     * Clears cache folders from old and orphaned files
     */
    public function clearCacheFiles(): void
    {
        $cacheDirs = [];
        $cacheDirs[] = $this->config->path('www.uploadDir');
        $cacheDirs[] = $this->config->path('www.downloadCacheDir');
        $cacheDirs[] = $this->config->path('adminApplication.assetsCacheDir') . '/js';
        $cacheDirs[] = $this->config->path('adminApplication.assetsCacheDir') . '/css';
        $cacheDirs[] = $this->config->path('adminApplication.assetsCacheDir') . '/img';
        $cacheDirs[] = $this->config->path('adminApplication.voltCacheDir');
        $rmPath = Util::which('rm');
        foreach ($cacheDirs as $cacheDir) {
            if (!empty($cacheDir)) {
                Processes::mwExec("{$rmPath} -rf {$cacheDir}/*");
            }
        }

        // Delete boot cache folders
        if (is_dir('/mountpoint') && self::isStorageDiskMounted()) {
            Processes::mwExec("{$rmPath} -rf /mountpoint");
        }
    }

    /**
     * Create system folders and links after upgrade and connect config DB
     */
    public function createWorkDirsAfterDBUpgrade(): void
    {
        $mountPath = Util::which('mount');
        Processes::mwExec("{$mountPath} -o remount,rw /offload 2> /dev/null");
        $this->createModulesCacheSymlinks();
        $this->applyFolderRights();
        Processes::mwExec("{$mountPath} -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Restore modules cache folders and symlinks
     */
    public function createModulesCacheSymlinks(): void
    {
        $modules = PbxExtensionModules::getModulesArray();
        foreach ($modules as $module) {
            PbxExtensionUtils::createAssetsSymlinks($module['uniqid']);
            PbxExtensionUtils::createAgiBinSymlinks($module['uniqid']);
        }
    }

    /**
     * Fixes permissions for Folder and Files
     */
    private function applyFolderRights(): void
    {
        // Add Rights to the WWW dirs plus some core dirs
        $www_dirs = [];
        $exec_dirs = [];

        $arrConfig = $this->config->toArray();
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

        $www_dirs[] = $this->config->path('core.tempDir');
        $www_dirs[] = $this->config->path('core.logsDir');

        // Create empty log files with www rights
        $logFiles = [
            $this->config->path('database.debugLogFile'),
            $this->config->path('cdrDatabase.debugLogFile'),
            $this->config->path('eventsLogDatabase.debugLogFile')
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

        // Add read rights
        Util::addRegularWWWRights(implode(' ', $www_dirs));

        // Add executable rights
        $exec_dirs[] = appPath('src/Core/Asterisk/agi-bin');
        $exec_dirs[] = appPath('src/Core/Rc');
        Util::addExecutableRights(implode(' ', $exec_dirs));

        $mountPath = Util::which('mount');
        Processes::mwExec("{$mountPath} -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Creates swap file on storage
     */
    public function mountSwap(): void
    {
        if(Util::isSystemctl()){
            // Не настраиваем.
            return;
        }
        $tempDir = $this->config->path('core.tempDir');
        $swapFile = "{$tempDir}/swapfile";

        $swapOffCmd = Util::which('swapoff');
        Processes::mwExec("{$swapOffCmd} {$swapFile}");

        $this->makeSwapFile($swapFile);
        if (!file_exists($swapFile)) {
            return;
        }
        $swapOnCmd = Util::which('swapon');
        $result = Processes::mwExec("{$swapOnCmd} {$swapFile}");
        Util::sysLogMsg('Swap', 'connect swap result: ' . $result, LOG_INFO);
    }

    /**
     * Создает swap файл на storage.
     * @param $swapFile
     */
    private function makeSwapFile($swapFile): void
    {
        $swapLabel = Util::which('swaplabel');
        if (Processes::mwExec("{$swapLabel} {$swapFile}") === 0) {
            // Файл уже существует.
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
            // Не достаточно свободного места.
            return;
        }
        $bs = 1024;
        $countBlock = $swapSize * $bs;
        $ddCmd = Util::which('dd');

        Util::sysLogMsg('Swap', 'make swap ' . $swapFile, LOG_INFO);
        Processes::mwExec("{$ddCmd} if=/dev/zero of={$swapFile} bs={$bs} count={$countBlock}");

        $mkSwapCmd = Util::which('mkswap');
        Processes::mwExec("{$mkSwapCmd} {$swapFile}");
    }

    /**
     * Returns free space on mounted storage disk
     *
     * @return int size in megabytes
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
     * Сохраняем новые данные диска.
     *
     * @param        $data
     * @param string $id
     */
    public function saveDiskSettings($data, $id = '1'): void
    {
        if (!is_array($data)) {
            return;
        }
        $disk_data = $this->getDiskSettings($id);
        if (count($disk_data) === 0) {
            $uniqid = strtoupper('STORAGE-DISK-' . md5(time()));
            $storage_settings = new StorageModel();
            foreach ($data as $key => $val) {
                $storage_settings->writeAttribute($key, $val);
            }
            $storage_settings->writeAttribute('uniqid', $uniqid);
            $storage_settings->save();
        } else {
            $storage_settings = StorageModel::findFirst("id = '$id'");
            if ($storage_settings === null) {
                return;
            }
            foreach ($data as $key => $value) {
                $storage_settings->writeAttribute($key, $value);
            }
            $storage_settings->save();
        }
    }

    /**
     * Получение имени диска, смонтированного на conf.recover.
     * @return string
     */
    public function getRecoverDiskName(): string
    {
        $disks = $this->diskGetDevices(true);
        foreach ($disks as $disk => $diskInfo) {
            // RAID содержит вложенный массив "children"
            if (isset($diskInfo['children'][0]['children'])) {
                $diskInfo = $diskInfo['children'][0];
                // Корректируем имя диска. Это RAID или иной виртуальный device.
                $disk = $diskInfo['name'];
            }
            foreach ($diskInfo['children'] as $child) {
                $mountpoint = $child['mountpoint'] ?? '';
                $diskPath = "/dev/{$disk}";
                if ($mountpoint === '/conf.recover' && file_exists($diskPath)) {
                    return "/dev/{$disk}";
                }
            }
        }
        return '';
    }
}
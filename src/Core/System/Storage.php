<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di;
use function MikoPBX\Common\Config\appPath;


/**
 * Вспомогательные методы.
 */
class Storage
{

    /**
     * @var \Phalcon\Di\DiInterface|null
     */
    private $di;

    /**
     * @var \Phalcon\Config
     */
    private $config;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di     = Di::getDefault();
        $this->config = $this->di->getShared('config');
    }

    /**
     * Возвращает директорию для хранения файлов записей разговоров.
     *
     * @return string
     */
    public static function getMonitorDir(): string
    {
        $di     = Di::getDefault();
        if ($di !== null){
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
        $di     = Di::getDefault();
        if ($di !== null){
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
        if ( ! file_exists("{$device}")) {
            return $result;
        }

        $tmp_dir = '/tmp/mnt_' . time();
        Util::mwMkdir($tmp_dir);
        $out = [];

        $storage  = new Storage();
        $uid_part = 'UUID=' . $storage->getUuid($device) . '';
        $format   = $storage->getFsType($device);
        if($format === ''){
            return false;
        }
        $mountPath = Util::which('mount');
        $umountPath = Util::which('umount');
        $rmPath = Util::which('rm');

        Util::mwExec("{$mountPath} -t {$format} {$uid_part} {$tmp_dir}", $out);
        if (is_dir("{$tmp_dir}/mikopbx") && trim(implode('', $out)) === '') {
            // $out - пустая строка, ошибок нет
            // присутствует каталог mikopbx.
            $result = true;
        }
        if (self::isStorageDiskMounted($device)) {
            Util::mwExec("{$umountPath} {$device}");
        }

        if ( ! self::isStorageDiskMounted($device)) {
            Util::mwExec("{$rmPath} -rf '{$tmp_dir}'");
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
        $blkidPath = Util::which('blkid');
        $busyboxPath = Util::which('busybox');
        $sedPath = Util::which('sed');
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        $headPath = Util::which('head');

        $res = Util::mwExec(
            "{$blkidPath} -ofull {$device} | {$busyboxPath} {$sedPath} -r 's/[[:alnum:]]+=/\\n&/g' | {$busyboxPath} {$grepPath} \"^UUID\" | {$busyboxPath} {$awkPath} -F \"\\\"\" '{print $2}' | {$headPath} -n 1",
            $output
        );
        if ($res == 0 && count($output) > 0) {
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
        $out    = [];
        Util::mwExec(
            "{$blkidPath} -ofull /dev/{$device} | {$busyboxPath} {$sedPath} -r 's/[[:alnum:]]+=/\\n&/g' | {$busyboxPath} {$grepPath} \"^TYPE=\" | {$busyboxPath} {$awkPath} -F \"\\\"\" '{print $2}'",
            $out
        );
        $format = implode('', $out);
        if ($format == 'msdosvfat') {
            $format = 'msdos';
        }

        return $format;
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
            $di     = Di::getDefault();
            if ($di !== null){
                $varEtcPath = $di->getConfig()->path('core.varEtcPath');
            } else {
                $varEtcPath = '/var/etc';
            }

            $filename   = "{$varEtcPath}/storage_device";
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
        Util::mwExec("{$mountPath} | {$grepPath} {$filter} | {$awkPath} '{print $3}'", $out);
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

        $out     = [];
        $timeoutPath = Util::which('timeout');
        $sshfsPath = Util::which('sshfs');

        $command = "{$timeoutPath} -t 3 {$sshfsPath} -p {$port} -o nonempty -o password_stdin -o 'StrictHostKeyChecking=no' " .
            "{$user}@{$host}:{$remout_dir} {$local_dir} << EOF\n" .
            "{$pass}\n" .
            "EOF\n";
        // file_put_contents('/tmp/sshfs_'.$host, $command);
        Util::mwExec($command, $out);
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
        if ( ! empty($user)) {
            $auth_line .= 'user="' . $user;
            if ( ! empty($pass)) {
                $auth_line .= ":{$pass}";
            }
            $auth_line .= '",';
        }

        $connect_line = 'ftp://' . $host;
        if ( ! empty($port)) {
            $connect_line .= ":{$port}";
        }
        if ( ! empty($remout_dir)) {
            $connect_line .= "$remout_dir";
        }

        $timeoutPath = Util::which('timeout');
        $curlftpfsPath = Util::which('curlftpfs');
        $command = "{$timeoutPath} -t 3 {$curlftpfsPath}  -o allow_other -o {$auth_line}fsname={$host} {$connect_line} {$local_dir}";
        Util::mwExec($command, $out);
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
        if ( ! file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        if ( ! file_exists($dev)) {
            return false;
        }
        $dir = '';
        self::isStorageDiskMounted("$dev", $dir);

        if (empty($dir) || self::umountDisk($dir)) {
            // Диск размонтирован.
            $st = new Storage();
            // Будет запущен процесс:
            $st->formatDiskLocal($dev, true);
            sleep(1);

            return (self::statusMkfs($dev) == 'inprogress');
        } else {
            // Ошибка размонтирования диска.
            return false;
        }
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
        $rmPath = Util::which('rm');
        if (self::isStorageDiskMounted($dir)) {
            Util::mwExec("/etc/rc/shell_functions.sh 'killprocesses' '$dir' -TERM 0");
            Util::mwExec("{$umountPath} {$dir}");
        }
        $result = ! self::isStorageDiskMounted($dir);
        if ($result && file_exists($dir)) {
            // Если диск не смонтирован, то удаляем каталог.
            Util::mwExec("{$rmPath} -rf '{$dir}'");
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
        $retVal = Util::mwExec(
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
    private function formatDiskLocalPart2($device, $bg = false)
    {
        if (is_numeric(substr($device, -1))) {
            $device_id = "";
        } else {
            $device_id = "1";
        }
        $format = 'ext4';
        $mkfsPath = Util::which("mkfs.{$format}");
        $cmd    = "{$mkfsPath} {$device}{$device_id}";
        if ($bg === false) {
            $retVal = Util::mwExec("{$cmd} 2>&1");
            Util::sysLogMsg(__CLASS__, "{$mkfsPath} returned {$retVal}");
        } else {
            usleep(200000);
            Util::mwExecBg($cmd);
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
        if ( ! file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        $out = [];
        $psPath = Util::which('ps');
        $grepPath = Util::which('grep');
        Util::mwExec("{$psPath} -A -f | {$grepPath} {$dev} | {$grepPath} mkfs | {$grepPath} -v grep", $out);
        $mount_dir = trim(implode('', $out));

        return empty($mount_dir) ? 'ended' : 'inprogress';
    }

    /**
     * Проверка свободного места на дисках. Уведомление в случае проблем.
     */
    public function checkFreeSpace(): void
    {
        $util    = new Util();
        $hdd     = $this->getAllHdd(true);
        // Создание больщого файла для тестов.
        // head -c 1500MB /dev/urandom > /storage/usbdisk1/big_file.mp3
        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true && ! self::isStorageDiskMounted("{$disk['id']}4")) {
                // Это системный диск (4ый раздел). Он не смонтирован.
                continue;
            }

            $free       = ($disk['free_space'] / $disk['size'] * 100);
            $need_alert = false;
            $test_alert = '';
            if ($free < 5) {
                $need_alert = true;
                $test_alert = "The {$disk['id']} has less than 5% of free space available.";
            }

            if ($disk['free_space'] < 500) {
                $need_alert = true;
                $test_alert = "The {$disk['id']} has less than 500MB of free space available.";
            }

            if ($disk['free_space'] < 100) {
                $need_alert  = true;
                $test_alert  = "The {$disk['id']} has less than 100MB of free space available. Old call records will be deleted.";
                Util::restartPHPWorker(WorkerRemoveOldRecords::class);
            }

            if ( ! $need_alert) {
                continue;
            }

            Util::sysLogMsg("STORAGE", $test_alert);
            $data = [
                'Device     - ' => "/dev/{$disk['id']}",
                'Directoire - ' => "{$disk['mounted']}",
                'Desciption - ' => $test_alert,
            ];
            // Добавляем задачу на уведомление.
            $util->addJobToBeanstalk('WorkerNotifyError_storage', $data);
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
            Util::mwExec(
                "{$dfPath} -k /storage/usbdisk1 | {$awkPath}  '{ print $1 \"|\" $3 \"|\" $4} ' | {$grepPath} -v 'Available'",
                $out
            );
            $disk_data = explode('|', implode(" ", $out));
            if (count($disk_data) === 3) {
                $m_size      = round(($disk_data[1] + $disk_data[2]) / 1024, 1);
                $res_disks[] = [
                    'id'         => $disk_data[0],
                    'size'       => "" . $m_size,
                    'size_text'  => "" . $m_size . " Mb",
                    'vendor'     => 'Debian',
                    'mounted'    => '/storage/usbdisk1',
                    'free_space' => round($disk_data[2] / 1024, 1),
                    'partitions' => [],
                    'sys_disk'   => true,
                ];
            }

            return $res_disks;
        }

        $cd_disks = $this->cdromGetDevices();
        $cd_disks = array_unique($cd_disks);

        // TODO Получение данных о дисках в формате JSON:
        // lsblk -J -b -o VENDOR,MODEL,SERIAL,LABEL,TYPE,FSTYPE,MOUNTPOINT,SUBSYSTEMS,NAME,UUID
        $disks = $this->diskGetDevices();
        $disks = array_unique($disks);

        $cf_disk    = '';
        $varEtcPath = $this->config->path('core.varEtcPath');
        if (file_exists($varEtcPath . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcPath . '/cfdevice'));
        }

        foreach ($disks as $disk) {
            if (in_array($disk, $cd_disks)) {
                // Это CD-ROM.
                continue;
            }
            unset($temp_vendor, $temp_size, $original_size);
            $mounted = self::diskIsMounted("{$disk}");
            if ($mounted_only === true && $mounted === false) {
                continue;
            }
            $sys_disk = ($cf_disk == $disk);

            $mb_size = 0;
            if (is_file("/sys/block/" . $disk . "/size")) {
                $original_size = trim(file_get_contents("/sys/block/" . $disk . "/size"));
                $original_size = ($original_size * 512 / 1024 / 1024);
                $mb_size       = $original_size;
            }
            if ($mb_size > 100) {
                $temp_size   = sprintf("%.0f MB", $mb_size);
                $temp_vendor = $this->getVendorDisk($disk);
                $free_space  = $this->getFreeSpace($disk);

                $arr_disk_info = $this->determineFormatFs($disk);
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
                    'id'         => $disk,
                    'size'       => $mb_size,
                    'size_text'  => $temp_size,
                    'vendor'     => $temp_vendor,
                    'mounted'    => $mounted,
                    'free_space' => $free_space,
                    'partitions' => $arr_disk_info,
                    'sys_disk'   => $sys_disk,
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
        $grepPath = Util::which('grep');
        $sysctlPath = Util::which('sysctl');
        $busyboxPath = Util::which('busybox');
        $cutPath = Util::which('cut');

        return explode(
            " ",
            trim(exec("{$sysctlPath} -n dev.cdrom.info | {$busyboxPath} {$grepPath} 'drive name' | {$busyboxPath} {$cutPath} -f 3"))
        );
    }

    /**
     * Получение массива подключенныйх HDD.
     *
     * @return array
     */
    private function diskGetDevices(): array
    {
        //  TODO // Переписать через использование lsblk.
        $grepPath = Util::which('grep');
        $lsPath = Util::which('ls');
        $trPath = Util::which('tr');
        return explode(" ", trim(exec("{$lsPath} /dev | {$grepPath} '^[a-z]d[a-z]' | {$trPath} \"\n\" \" \"")));
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
        Util::mwExec("{$mountPath} | {$grepPath} '{$filter}{$disk}'", $out);
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
     * @param $disk
     *
     * @return string
     */
    private function getVendorDisk($disk): string
    {
        $temp_vendor = [];
        if (is_file("/sys/block/" . $disk . "/device/vendor")) {
            $data = trim(file_get_contents("/sys/block/" . $disk . "/device/vendor"));
            if ($data != '') {
                $temp_vendor[] = trim(str_replace(',', ' ', $data));
            }
        }
        if (is_file("/sys/block/" . $disk . "/device/model")) {
            $data = trim(file_get_contents("/sys/block/" . $disk . "/device/model"));
            if ($data != '') {
                $temp_vendor[] = trim(str_replace(',', ' ', $data));
            }
        }
        if (count($temp_vendor) == 0) {
            $temp_vendor[] = $disk;
        }
        if (is_file("/sys/block/" . $disk . "/device/type")) {
            $data = trim(file_get_contents("/sys/block/" . $disk . "/device/type"));
            if ($data != '') {
                $temp_vendor[] = trim(str_replace(',', ' ', $data));
            }
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
        Util::mwExec("{$dfPath} -m | {$grepPath} {$hdd} | {$awkPath} '{print $4}'", $out);
        $result = 0;
        foreach ($out as $res) {
            if ( ! is_numeric($res)) {
                continue;
            }
            $result += (1 * $res);
        }

        return $result;
    }

    /**
     * Определить формат файловой системы и размер дисков.
     *
     * @param $device
     *
     * @return array|bool
     */
    public function determineFormatFs($device)
    {
        $grepPath = Util::which('grep');
        $lsPath = Util::which('ls');
        $trPath = Util::which('tr');
        $allow_formats = ['ext2', 'ext4', 'fat', 'ntfs', 'msdos'];
        $device        = str_replace('/dev/', '', $device);
        $devices       = explode(" ", trim(exec("{$lsPath} /dev | {$grepPath} '{$device}' | {$trPath} \"\n\" \" \"")));

        $result_data = [];
        foreach ($devices as $dev) {
            if (empty($dev) || (count($devices) > 1 && $device == $dev) || is_dir("/sys/block/{$dev}")) {
                continue;
            }
            $mb_size        = 0;
            $path_size_info = '';
            $tmp_path       = "/sys/block/{$device}/{$dev}/size";
            if (file_exists($tmp_path)) {
                $path_size_info = $tmp_path;
            }
            if (empty($path_size_info)) {
                $tmp_path = "/sys/block/" . substr($dev, 0, 3) . "/{$dev}/size";
                if (file_exists($tmp_path)) {
                    $path_size_info = $tmp_path;
                }
            }

            if ( ! empty($path_size_info)) {
                $original_size = trim(file_get_contents($path_size_info));
                $original_size = ($original_size * 512 / 1024 / 1024);
                $mb_size       = $original_size;
            }

            $tmp_dir = "/tmp/{$dev}_" . time();
            $out     = [];

            $fs           = null;
            $need_unmount = false;
            $mount_dir    = '';
            if (self::isStorageDiskMounted("/dev/{$dev} ", $mount_dir)) {
                $grepPath = Util::which('grep');
                $awkPath = Util::which('awk');
                $mountPath = Util::which('mount');
                Util::mwExec("{$mountPath} | {$grepPath} '/dev/{$dev}' | {$awkPath} '{print $5}'", $out);
                $fs         = trim(implode("", $out));
                $fs         = ($fs == 'fuseblk') ? 'ntfs' : $fs;
                $free_space = $this->getFreeSpace("/dev/{$dev} ");
                $used_space = $mb_size - $free_space;
            } else {
                $format = $this->getFsType($device);
                if (in_array($format, $allow_formats)) {
                    $fs = $format;
                }
                self::mountDisk($dev, $format, $tmp_dir);

                $need_unmount = true;
                $used_space   = Util::getSizeOfFile("$tmp_dir");
            }
            $result_data[] = [
                "dev"        => $dev,
                'size'       => round($mb_size, 2),
                "used_space" => round($used_space, 2),
                "free_space" => round($mb_size - $used_space, 2),
                "uuid"       => $this->getUuid("/dev/{$dev} "),
                "fs"         => $fs,
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

        if ( ! file_exists($dir)) {
            Util::sysLogMsg('Storage', "Unable mount $dev $format to $dir. Unable create dir.");

            return false;
        }
        $dev = str_replace('/dev/', '', $dev);
        if ('ntfs' == $format) {
            $mountNtfs3gPath = Util::which('mount.ntfs-3g');
            Util::mwExec("{$mountNtfs3gPath} /dev/{$dev} {$dir}", $out);
        } else {
            $storage  = new Storage();
            $uid_part = 'UUID=' . $storage->getUuid("/dev/{$dev}") . '';
            $mountPath = Util::which('mount');
            Util::mwExec("{$mountPath} -t {$format} {$uid_part} {$dir}", $out);
        }

        return self::isStorageDiskMounted("/dev/{$dev} ");
    }

    /**
     * Монтирование разделов диска с базой данных настроек.
     */
    public function configure(): void
    {
        $cf_disk          = '';
        $varEtcPath       = $this->config->path('core.varEtcPath');
        $storage_dev_file = "{$varEtcPath}/storage_device";
        if (file_exists($storage_dev_file)) {
            unlink($storage_dev_file);
        }

        if (file_exists($varEtcPath . '/cfdevice')) {
            $cf_disk = trim(file_get_contents($varEtcPath . '/cfdevice'));
        }

        $disks = $this->getDiskSettings();
        $conf  = '';
        foreach ($disks as $disk) {
            clearstatcache();
            if ($disk['device'] !== "/dev/{$cf_disk}") {
                // Если это обычный диск, то раздел 1.
                $dev = "{$disk['device']}1";
            } else {
                // Если это системный диск, то пытаемся подключить раздел 4.
                $dev = "{$disk['device']}4";
            }
            if ( ! $this->hddExists($dev)) {
                // Диск не существует.
                continue;
            }
            if ($disk['media'] === '1' || ! file_exists($storage_dev_file)) {
                file_put_contents($storage_dev_file, "/storage/usbdisk{$disk['id']}");
                $this->updateConfigWithNewMountPoint("/storage/usbdisk{$disk['id']}");
            }

            $str_uid     = 'UUID=' . $this->getUuid($dev) . '';
            $format_p4   = $this->getFsType($dev);
            $conf        .= "{$str_uid} /storage/usbdisk{$disk['id']} {$format_p4} async,rw 0 0\n";
            $mount_point = "/storage/usbdisk{$disk['id']}";
            Util::mwMkdir($mount_point);
        }
        $this->saveFstab($conf);
        $this->createWorkDirs();
        System::setupPhpLog();
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
            $pbxSettings = StorageModel::find();
            if ($pbxSettings) {
                // Возвращаем данные до модификации.
                $data = $pbxSettings->toArray();
            }
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
        $uid    = $this->getUuid("{$disk}");
        if (file_exists("{$disk}") && $uid !== false) {
            $result = true;
        }

        return $result;
    }

    /**
     * After mount storage we will change /mountpoint/ to new $mount_point value
     *
     * @param string $mount_point
     *
     * @throws \JsonException
     */
    private function updateConfigWithNewMountPoint(string $mount_point): void
    {
        $staticSettingsFile     = '/etc/inc/mikopbx-settings.json';
        $staticSettingsFileOrig =  appPath('config/mikopbx-settings.json');

        $jsonString = file_get_contents($staticSettingsFileOrig);
        $data       = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        foreach ($data as $rootKey => $rootEntry) {
            foreach ($rootEntry as $nestedKey => $entry) {
                if (stripos($entry, '/mountpoint') !== false) {
                    $data[$rootKey][$nestedKey] = str_ireplace('/mountpoint', $mount_point, $entry);
                }
            }
        }
        $newJsonString = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents($staticSettingsFile, $newJsonString);

        // Update config variable
        $this->di->remove('config');
        $this->di->register(new ConfigProvider());
        $this->config = $this->di->getShared('config');

    }

    /**
     * Генерация файла fstab. Монтирование разделов.
     *
     * @param string $conf
     */
    public function saveFstab($conf = ''): void
    {
        $varEtcPath = $this->config->path('core.varEtcPath');
        // Точка монтирования доп. дисков.
        Util::mwMkdir('/storage');
        $chmodPath = Util::which('chmod');
        Util::mwExec("{$chmodPath} 755 /storage");
        if ( ! file_exists($varEtcPath . '/cfdevice')) {
            return;
        }
        $fstab     = '';
        $file_data = file_get_contents($varEtcPath . '/cfdevice');
        $cf_disk   = trim($file_data);
        if ('' == $cf_disk) {
            return;
        }
        // $part1 	 = (strpos($cf_disk, "mmcblk") !== false)?"{$cf_disk}p1":"{$cf_disk}1"; // Boot
        $part2 = (strpos($cf_disk, 'mmcblk') !== false) ? "{$cf_disk}p2" : "{$cf_disk}2"; // Offload
        $part3 = (strpos($cf_disk, 'mmcblk') !== false) ? "{$cf_disk}p3" : "{$cf_disk}3"; // Conf


        $uid_part2 = 'UUID=' . $this->getUuid("/dev/{$part2}") . '';
        $format_p2 = $this->getFsType($part2);
        $uid_part3 = 'UUID=' . $this->getUuid("/dev/{$part3}") . '';
        $format_p3 = $this->getFsType($part3);

        // $fstab .= "/dev/{$part1} /cf msdos ro 1 1\n"; // НЕ МОНТИРУЕМ!
        $fstab .= "{$uid_part2} /offload {$format_p2} ro 0 0\n";
        $fstab .= "{$uid_part3} /cf {$format_p3} rw 1 1\n";
        $fstab .= $conf;

        file_put_contents("/etc/fstab", $fstab);
        // Дублируем для работы vmtoolsd.
        file_put_contents("/etc/mtab", $fstab);
        $mountPath = Util::which('mount');
        Util::mwExec("{$mountPath} -a 2> /dev/null");
        Util::addRegularWWWRights('/cf');
    }

    /**
     * Create system folders
     *
     * @return void
     */
    private function createWorkDirs(): void{
        $path = '';
        $mountPath = Util::which('mount');
        Util::mwExec("{$mountPath} -o remount,rw /offload 2> /dev/null");

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
                if($isLiveCd && strpos($entry, '/offload/') === 0){
                    continue;
                }
                $path .= " $entry";
            }
        }

        if (!empty($path)) {
            Util::mwMkdir($path);
        }

        $jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir') . '/js', $jsCacheDir);

        $cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir') . '/css', $cssCacheDir);

        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir') . '/img', $imgCacheDir);
        Util::createUpdateSymlink($this->config->path('core.phpSessionPath'), '/var/lib/php/session');
        Util::createUpdateSymlink($this->config->path('core.tempPath'), '/ultmp');

        $filePath = appPath('src/Core/Asterisk/Configs/lua/extensions.lua');
        Util::createUpdateSymlink($filePath, '/etc/asterisk/extensions.lua');

        // Create symlinks to AGI-BIN
        $agiBinDir = $this->config->path('asterisk.astagidir');
        Util::mwMkdir($agiBinDir);

        $roAgiBinFolder = appPath('src/Core/Asterisk/agi-bin');
        $files = glob("$roAgiBinFolder/*.{php}", GLOB_BRACE);
        foreach ($files as $file) {
            $fileInfo = pathinfo($file);
            $newFilename = "{$agiBinDir}/{$fileInfo['filename']}.{$fileInfo['extension']}";
            Util::createUpdateSymlink($file, $newFilename);
        }

        $this->applyFolderRights();
    }

    /**
     * Fix permissions for Folder and Files
     */
    private function applyFolderRights(): void
    {
        // Add Rights to the WWW dirs plus some core dirs
        $www_dirs  = [];
        $arrConfig = $this->config->adminApplication->toArray();
        foreach ($arrConfig as $key => $entry) {
            if (stripos($key, 'path') === false
                && stripos($key, 'dir') === false
            ) {
                continue;
            }
            $www_dirs[] = $entry;
        }

        $www_dirs[] = $this->config->path('database.logsPath');
        $www_dirs[] = $this->config->path('core.phpSessionPath');
        $www_dirs[] = $this->config->path('core.tempPath');
        $www_dirs[] = '/etc/version';
        $www_dirs[] = appPath('/');

        // Add read rights
        Util::addRegularWWWRights(implode(' ', $www_dirs));

        // Add executable rights
        $exec_dirs[] = appPath('src/Core/Asterisk/agi-bin');
        $exec_dirs[] = appPath('src/Core/Rc');
        Util::addExecutableRights(implode(' ', $exec_dirs));

        $mountPath = Util::which('mount');
        Util::mwExec("{$mountPath} -o remount,ro /offload 2> /dev/null");
    }

    /**
     * Сохраняем новые данные диска.
     *
     * @param        $data
     * @param string $id
     */
    public function saveDiskSettings($data, $id = '1'): void
    {
        if ( ! is_array($data)) {
            return;
        }
        $disk_data = $this->getDiskSettings($id);
        if (count($disk_data) === 0) {
            $uniqid           = strtoupper('STORAGE-DISK-' . md5(time()));
            $storage_settings = new StorageModel();
            foreach ($data as $key => $val) {
                $storage_settings->writeAttribute($key, $val);
            }
            $storage_settings->writeAttribute('uniqid', $uniqid);
            $storage_settings->save();
        } else {
            $storage_settings = StorageModel::findFirst("id = '$id'");
            if ($storage_settings === null){
                return;
            }
            foreach ($data as $key => $value) {
                $storage_settings->writeAttribute($key, $value);
            }
            $storage_settings->save();
        }
    }
}
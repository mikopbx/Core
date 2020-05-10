<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */
namespace MikoPBX\Core\System;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Models\{
    PbxExtensionModules,
    Storage as StorageModel
};
use Phalcon\Di;


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
    static function getMonitorDir()
    {
        return Di::getDefault()->getConfig()->path('asterisk.monitordir');
    }

    /**
     * Возвращает директорию для хранения media файлов.
     *
     * @return string
     */
    static function getMediaDir()
    {
        return Di::getDefault()->getConfig()->path('core.mediaMountPoint');
    }


    /**
     * Прверяем является ли диск хранилищем.
     *
     * @param $device
     *
     * @return bool
     */
    static function isStorageDisk($device)
    {
        $result = false;
        if ( ! file_exists("{$device}")) {
            return $result;
        }

        $tmp_dir = '/tmp/mnt_' . time();

        if ( ! file_exists($tmp_dir) && ! mkdir($tmp_dir, 0777, true) && ! is_dir($tmp_dir)) {
            Util::sysLogMsg('Storage', 'Unable to create directory ' . $tmp_dir);

            return $result;
        }
        $out = [];

        $storage  = new Storage();
        $uid_part = 'UUID=' . $storage->getUuid($device) . '';
        $format   = $storage->getFsType($device);

        Util::mwExec("mount -t {$format} {$uid_part} {$tmp_dir}", $out);
        if (is_dir("{$tmp_dir}/mikopbx") && trim(implode('', $out)) === '') {
            // $out - пустая строка, ошибок нет
            // присутствует каталог mikopbx.
            $result = true;
        }
        if (self::isStorageDiskMounted($device)) {
            Util::mwExec("umount {$device}");
        }

        if ( ! self::isStorageDiskMounted($device)) {
            Util::mwExec("rm -rf '{$tmp_dir}'");
        }

        return $result;
    }

    /**
     * Получение идентификатора устройства.
     *
     * @param $device
     *
     * @return bool
     */
    public function getUuid($device)
    {
        if (strlen($device) == 0) {
            return false;
        }
        $res = Util::mwExec("/sbin/blkid -ofull {$device} | /bin/busybox sed -r 's/[[:alnum:]]+=/\\n&/g' | /bin/busybox grep \"^UUID\" | /bin/busybox awk -F \"\\\"\" '{print $2}' | /usr/bin/head -n 1",
            $output);
        if ($res == 0 && count($output) > 0) {
            $result = $output[0];
        } else {
            $result = false;
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
    public function getFsType($device)
    {
        $device = str_replace('/dev/', '', $device);
        $out    = [];
        Util::mwExec("/sbin/blkid -ofull /dev/{$device} | /bin/busybox sed -r 's/[[:alnum:]]+=/\\n&/g' | /bin/busybox grep \"^TYPE=\" | /bin/busybox awk -F \"\\\"\" '{print $2}'",
            $out);
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
    static function isStorageDiskMounted($filter = '', &$mount_dir = '')
    {
        if (Util::isSystemctl() && file_exists('/storage/usbdisk1/')) {
            $mount_dir = '/storage/usbdisk1/';

            return true;
        }
        if ('' == $filter) {
            $res_disk   = null;
            $varEtcPath = Di::getDefault()->getConfig()->path('core.varEtcPath');
            $filename   = "{$varEtcPath}/storage_device";
            if (file_exists($filename)) {
                $filter = file_get_contents($filename);
            } else {
                $filter = 'usbdisk1';
            }
        }
        $filter = escapeshellarg($filter);

        $out = [];
        Util::mwExec("mount | grep {$filter} | awk '{print $3}'", $out);
        $mount_dir = trim(implode('', $out));

        return ($mount_dir == '') ? false : true;
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
    static function mountSftpDisk($host, $port, $user, $pass, $remout_dir, $local_dir)
    {
        if ( ! file_exists($local_dir) && ! mkdir($local_dir, 0777, true) && ! is_dir($local_dir)) {
            return false;
        }

        $out     = [];
        $command = "/usr/bin/timeout -t 3 /usr/bin/sshfs -p {$port} -o nonempty -o password_stdin -o 'StrictHostKeyChecking=no' " .
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

        return Storage::isStorageDiskMounted("$local_dir ");
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
    static function mountFtp($host, $port, $user, $pass, $remout_dir, $local_dir)
    {
        if ( ! file_exists($local_dir) && ! mkdir($local_dir, 0777, true) && ! is_dir($local_dir)) {
            return false;
        }
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

        $command = "/usr/bin/timeout -t 3 /usr/bin/curlftpfs  -o allow_other -o {$auth_line}fsname={$host} {$connect_line} {$local_dir}";
        Util::mwExec($command, $out);
        $response = trim(implode('', $out));
        if ('Terminated' === $response) {
            // Удаленный сервер не ответил / или не корректно указан пароль.
            unset($response);
        }

        return Storage::isStorageDiskMounted("$local_dir ");
    }

    /**
     * Запускает процесс форматирования диска.
     *
     * @param $dev
     *
     * @return array|bool
     */
    static function mkfs_disk($dev)
    {
        if ( ! file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        if ( ! file_exists($dev)) {
            return false;
        }
        $dir = '';
        Storage::isStorageDiskMounted("$dev", $dir);

        if (empty($dir) || Storage::umountDisk($dir)) {
            // Диск размонтирован.
            $st = new Storage();
            // Будет запущен процесс:
            $st->formatDiskLocal($dev, true);
            sleep(1);

            return (Storage::statusMkfs($dev) == 'inprogress');
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
    static function umountDisk($dir)
    {
        if (self::isStorageDiskMounted($dir)) {
            Util::mwExec("/etc/rc/shell_functions.sh 'killprocesses' '$dir' -TERM 0");
            Util::mwExec("umount {$dir}");
        }
        $result = ! self::isStorageDiskMounted($dir);
        if ($result && file_exists($dir)) {
            // Если диск не смонтирован, то удаляем каталог.
            Util::mwExec("rm -rf '{$dir}'");
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
        openlog("storage", LOG_NDELAY, LOG_DAEMON);
        // overwrite with fresh DOS partition table
        Util::mwExec("echo \"o\n" .
            // create new
            "n\n" .
            // primary partition
            "p\n" .
            // number 1
            "1\n" .
            // from the beginning
            "\n" .
            // to the end
            "\n" .
            // change type
            /*
            "t\n" .
            // to FAT32
            "b\n" .
            // set active
            "a\n" .
            // partition 1
            "1\n" .
            */
            // and write changes
            "w\n" .
            "\" | fdisk " . $device, $out, $retval);
        syslog(LOG_NOTICE, "fdisk returned " . $retval);
        closelog();

        if (false == $bg) {
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
        $cmd    = "/sbin/mkfs.{$format} {$device}{$device_id}";
        if ($bg == false) {
            openlog("storage_format_disk", LOG_NDELAY, LOG_DAEMON);
            Util::mwExec("$cmd 2>&1", $out, $retval);
            syslog(LOG_NOTICE, "mkfs.{$format} returned $retval");
            closelog();
        } else {
            usleep(200000);
            Util::mwExecBg("$cmd");
            $retval = true;
        }

        return $retval;
    }

    /**
     * Возвращает текущий статус форматирования диска.
     *
     * @param $dev
     *
     * @return string
     */
    static function statusMkfs($dev):string
    {
        if ( ! file_exists($dev)) {
            $dev = "/dev/{$dev}";
        }
        $out = [];
        Util::mwExec("ps -A -f | grep {$dev} | grep mkfs | grep -v grep", $out);
        $mount_dir = trim(implode('', $out));

        return ($mount_dir == '') ? 'ended' : 'inprogress';
    }

    /**
     * Проверка свободного места на дисках. Уведомление в случае проблем.
     */
    public function checkFreeSpace()
    {
        $storage = new Storage();
        $util    = new Util();
        $hdd     = $storage->getAllHdd(true);
        // Создание больщого файла для тестов.
        // head -c 1500MB /dev/urandom > /storage/usbdisk1/big_file.mp3
        foreach ($hdd as $disk) {
            if ($disk['sys_disk'] === true && ! Storage::isStorageDiskMounted("{$disk['id']}4")) {
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
                $workersPath = $this->di->get('config')->core->workersPath;
                Util::mwExecBg("/usr/bin/php -f {$workersPath}/WorkerRemoveOldRecords.php");
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
    public function getAllHdd($mounted_only = false)
    {
        $res_disks = [];

        if (Util::isSystemctl()) {
            $out = [];
            Util::mwExec("/usr/bin/df -k /storage/usbdisk1 | awk  '{ print $1 \"|\" $3 \"|\" $4} ' | grep -v 'Available'",
                $out);
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
            $mounted = Storage::diskIsMounted("{$disk}");
            if ($mounted_only == true && $mounted == false) {
                continue;
            }
            $sys_disk = ($cf_disk == $disk) ? true : false;

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
    private function cdromGetDevices()
    {
        return explode(" ",
            trim(exec('/sbin/sysctl -n dev.cdrom.info | /bin/busybox grep "drive name" | /bin/busybox cut -f 3')));
    }

    /**
     * Получение массива подключенныйх HDD.
     *
     * @return array
     */
    private function diskGetDevices()
    {
        //  TODO // Переписать через использование lsblk.
        return explode(" ", trim(exec("/bin/ls /dev | grep '^[a-z]d[a-z]' | tr \"\n\" \" \"")));
    }

    /**
     * Проверка, смонтирован ли диск.
     *
     * @param $disk
     * @param $filter
     *
     * @return bool
     */
    static function diskIsMounted($disk, $filter = '/dev/')
    {

        $out = [];
        Util::mwExec("mount | grep '{$filter}{$disk}'", $out);
        if (count($out) > 0) {
            $res_out = end($out);
        } else {
            $res_out = implode('', $out);
        }
        $data = explode(' ', trim($res_out));

        $result = (count($data) > 2) ? $data[2] : false;

        return $result;
    }

    /**
     * Получение сведений по диску.
     *
     * @param $disk
     *
     * @return string
     */
    private function getVendorDisk($disk)
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
        Util::mwExec("df -m | grep {$hdd} | awk '{print $4}'", $out);
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
        $allow_formats = ['ext2', 'ext4', 'fat', 'ntfs', 'msdos'];
        $device        = str_replace('/dev/', '', $device);
        $devices       = explode(" ", trim(exec("/bin/ls /dev | grep '{$device}' | tr \"\n\" \" \"")));

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
            if (Storage::isStorageDiskMounted("/dev/{$dev} ", $mount_dir)) {
                Util::mwExec("mount | grep '/dev/{$dev}' | awk '{print $5}'", $out);
                $fs         = trim(implode("", $out));
                $fs         = ($fs == 'fuseblk') ? 'ntfs' : $fs;
                $free_space = $this->getFreeSpace("/dev/{$dev} ");
                $used_space = $mb_size - $free_space;
            } else {
                $format = $this->getFsType($device);
                if (in_array($format, $allow_formats)) {
                    $fs = $format;
                }
                Storage::mountDisk($dev, $format, $tmp_dir);

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
                Storage::umountDisk($tmp_dir);
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
    static function mountDisk($dev, $format, $dir)
    {
        if (Storage::isStorageDiskMounted("/dev/{$dev} ")) {
            return true;
        }
        if ( ! file_exists($dir) && ! mkdir($dir, 0777, true) && ! is_dir($dir)) {
            return false;
        }

        if ( ! file_exists($dir)) {
            Util::sysLogMsg('Storage', "Unable mount $dev $format to $dir. Unable create dir.");

            return false;
        }
        $dev = str_replace('/dev/', '', $dev);
        if ('ntfs' == $format) {
            Util::mwExec("mount.ntfs-3g /dev/{$dev} {$dir}", $out);
        } else {
            $storage  = new Storage();
            $uid_part = 'UUID=' . $storage->getUuid("/dev/{$dev}") . '';
            Util::mwExec("mount -t {$format} {$uid_part} {$dir}", $out);
        }

        return Storage::isStorageDiskMounted("/dev/{$dev} ");
    }

    /**
     * Монтирование разделов диска с базой данных настроек.
     */
    public function configure(): void
    {
        $is_mounted = false;
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
            $is_mounted  = $this->isStorageDiskMounted("/storage/usbdisk{$disk['id']}");
            $mount_point = "/storage/usbdisk{$disk['id']}";
            if ( ! file_exists($mount_point)) {
                Util::mwExec("mkdir -p {$mount_point}");
            }
        }
        $this->saveFstab($conf);
        $this->createWorkDirs();
        System::setupPhpLog();

        if ($is_mounted) {
            $this->deleteOldModules();
        }
    }

    /**
     * After mount storage we will change /mountpoint/ to new $mount_point value
     *
     * @param string $mount_point
     */
    private function updateConfigWithNewMountPoint(string $mount_point): void
    {
        $staticSettingsFile = '/etc/inc/mikopbx-settings.json';
        $staticSettingsFileOrig = '/usr/www/config/mikopbx-settings.json';

        $jsonString = file_get_contents($staticSettingsFileOrig);
        $data       = json_decode($jsonString, true);
        foreach ($data as $rootKey=>$rootEntry) {
            foreach ($rootEntry as $nestedKey => $entry) {
                if (stripos($entry,'/mountpoint')!==false) {
                    $data[$rootKey][$nestedKey] = str_ireplace('/mountpoint', $mount_point, $entry);
                }
            }
        }
        $newJsonString = json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
        file_put_contents($staticSettingsFile, $newJsonString);

        // Update config variable
        $this->di->remove('config');
        $this->di->register(new ConfigProvider());
        $this->config = $this->di->getShared('config');
    }

    /**
     * Получаем настройки диска из базы данных.
     *
     * @param string $id
     *
     * @return array
     */
    public function getDiskSettings($id = '')
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
            if ($pbxSettings) {
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
    private function hddExists($disk)
    {
        $result = false;
        $uid    = $this->getUuid("{$disk}");
        if (file_exists("{$disk}") && $uid !== false) {
            $result = true;
        }

        return $result;
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
        Util::mwExec('mkdir -p /storage/');
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
        Util::mwExec('mount -a 2> /dev/null');
        Util::mwExec('chown -R www:www /cf > /dev/null 2> /dev/null');
    }

    /**
     * Create system folders and apply rights to them
     *
     * @return bool
     */
    private function createWorkDirs(): bool
    {
        $path = '';
        Util::mwExec('mount -o remount,rw /offload 2> /dev/null');

        // Create dirs
        $arrConfig = $this->config->toArray();
        foreach ($arrConfig as $rootEntry) {
            foreach ($rootEntry as $key => $entry) {
                if (stripos ($key, 'path') === false
                    && stripos($key, 'dir') === false
                ) {
                    continue;
                }

                if (file_exists($entry)) {
                    continue;
                }
                $path .= " $entry";
            }
        }

        if ( ! empty($path)) {
            Util::mwExec("mkdir -p $path");
        }

        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir').'/js',
            $this->config->path('adminApplication.jsCacheDir'));
        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir').'/css',
            $this->config->path('adminApplication.cssCacheDir'));
        Util::createUpdateSymlink($this->config->path('adminApplication.cacheDir').'/img',
            $this->config->path('adminApplication.imgCacheDir'));
        Util::createUpdateSymlink($this->config->path('core.phpSessionPath'), '/var/lib/php/session');
        Util::createUpdateSymlink($this->config->path('core.tempPath'), '/ultmp');
        Util::createUpdateSymlink($this->config->path('core.rootPath').'/src/ext/lua/asterisk/extensions.lua', '/etc/asterisk/extensions.lua'); //TODO:Этот файл используется?

        $this->applyFolderRights();

        return true;
    }

    /**
     * Fix permissions for Folder and Files
     */
    private function applyFolderRights():void
    {
        // Add Rights to the WWW dirs plus some core dirs
        $www_dirs = [];
        $arrConfig = $this->config->adminApplication->toArray();
        foreach ($arrConfig as $key => $entry) {
            if (stripos($key,'path') === false
                && stripos($key,'dir') === false
            ) {
                continue;
            }
            $www_dirs[] = $entry;
        }

        $www_dirs[] = $this->config->path('database.logsPath');
        $www_dirs[] = $this->config->path('core.phpSessionPath');
        $www_dirs[] = $this->config->path('core.tempPath');

        // Add read rights
        Util::mwExec('find ' . implode(' ', $www_dirs). ' -type d -exec chmod 755 {} \;');
        Util::mwExec('find ' . implode(' ', $www_dirs). ' -type f -exec chmod 644 {} \;');
        Util::mwExec('chown -R www:www ' . implode(' ', $www_dirs));

        // Add executable rights
        $exec_dirs[] = $this->config->path('asterisk.astagidir');
        $exec_dirs[] = $this->config->path('core.workersPath');
        $exec_dirs[] = $this->config->path('core.rcDir');
        Util::mwExec('find ' . implode(' ', $exec_dirs). ' -type f -exec chmod +x {} \;');
        Util::mwExec('mount -o remount,ro /offload 2> /dev/null');
    }


    /**
     * Delete old modules, not installed on the system
     */
    private function deleteOldModules(): void
    {
        // Проверим подключены ли модули.
        /** @var \MikoPBX\Common\Models\PbxExtensionModules $modules */
        $modules = PbxExtensionModules::find();
        foreach ($modules as $module) {
            if ( ! is_dir("{$this->config->path('core.modulesDir')}/{$module->uniqid}")) {
                // Модуль не установлен... Нужно дать возможность переустановить модуль.
                // Чистим запись об установленном модуле:
                $modules->delete();
            }
        }
    }

    /**
     * Сохраняем новые данные диска.
     *
     * @param     $data
     * @param int $id
     */
    public function saveDiskSettings($data, $id = '1')
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
            foreach ($data as $key => $value) {
                $storage_settings->writeAttribute($key, $value);
            }
            $storage_settings->save();
        }
    }
}
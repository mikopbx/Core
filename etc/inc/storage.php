<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2019
 */

require_once 'globals.php';
/**
* Вспомогательные методы. 
*/
class Storage {
    /**
     * Получение массива подключенныйх HDD.
     * @return array
     */
    private function disk_get_devices() {
        //  TODO // Переписать через использование lsblk.
		return explode(" ", trim(exec("/bin/ls /dev | grep '^[a-z]d[a-z]' | tr \"\n\" \" \"")));
	}

    /**
     * Получение массива подключенныйх cdrom.
     * @return array
     */
	private function cdrom_get_devices() {
		return explode(" ", trim(exec('/sbin/sysctl -n dev.cdrom.info | /bin/busybox grep "drive name" | /bin/busybox cut -f 3') ));
	}

    /**
     * Получение сведений по диску.
     * @param $disk
     * @return string
     */
	private function get_vendor_disk($disk){
		$temp_vendor = array();
		if( is_file("/sys/block/".$disk."/device/vendor") ){
            $data = trim(file_get_contents("/sys/block/".$disk."/device/vendor"));
            if($data != ''){
                $temp_vendor[] = trim(str_replace(',',' ', $data));
            }
		}
		if( is_file("/sys/block/".$disk."/device/model") ){
			$data = trim(file_get_contents("/sys/block/".$disk."/device/model"));
            if($data != ''){
                $temp_vendor[] = trim(str_replace(',',' ', $data));
            }
		}
		if(count($temp_vendor) == 0){
			$temp_vendor[] = $disk;
		}
		if(is_file("/sys/block/".$disk."/device/type")){
            $data = trim(file_get_contents("/sys/block/".$disk."/device/type"));
            if($data != ''){
                $temp_vendor[] = trim(str_replace(',',' ', $data));
            }
		}
		return implode(', ', $temp_vendor);
	}

    /**
     * Проверка, смонтирован ли диск.
     * @param $disk
     * @param $filter
     * @return bool
     */
	static function disk_is_mounted($disk, $filter = '/dev/'){
		
		$out = [];
        Util::mwexec("mount | grep '{$filter}{$disk}'", $out);
		if(count($out)>0){
            $res_out = end($out);
        }else{
            $res_out = implode('', $out);
        }
		$data = explode(' ', trim($res_out));
				
		$result = (count($data) > 2) ? $data[2] : false;
		return $result;
	}

    /**
     * Возвращает директорию для хранения media файлов.
     * @return string
     */
	static function get_media_dir(){
		$dir = "/var/asterisk/spool";
		if( Storage::is_storage_disk_mounted() ){
            $storage_dev_file = "{$GLOBALS['g']['varetc_path']}/storage_device";
            if(file_exists($storage_dev_file)){
                $dir = file_get_contents($storage_dev_file);
            }else{
                $dir = '/storage/usbdisk1';
            }
		}
		return $dir;
	}

    /**
     * Возвращает директорию для хранения файлов записей разговоров.
     * @return string
     */
	static function get_monitor_dir(){
	    global $g;
		$mount_point = Storage::get_media_dir();
		return "{$mount_point}/{$g['pt1c_pbx_name']}/voicemailarchive/monitor/";
	}

    /**
     * Получаем свободное место на диске в Mb.
     * @param $hdd
     * @return mixed
     */
	public function get_free_space($hdd){
        $out = array();
        $hdd = escapeshellarg($hdd);
        Util::mwexec("df | grep {$hdd} | awk '{print $4}'",$out);
        $result = 0;
        foreach ($out as $res){
            $result += (1*$res)/1024;
        }
        return $result;
    }

    /**
     * Проверка свободного места на дисках. Уведомление в случае проблем.
     */
    public function check_free_space(){
        $storage = new Storage();
        $util    = new Util();
        $hdd     = $storage->get_all_hdd( true );
        // Создание больщого файла для тестов.
        // head -c 1500MB /dev/urandom > /storage/usbdisk1/big_file.mp3
        foreach ($hdd as $disk){
            if($disk['sys_disk'] == true && !Storage::is_storage_disk_mounted("{$disk['id']}4")){
                // Это системный диск (4ый раздел). Он не смонтирован.
                continue;
            }

            $free = ($disk['free_space'] / $disk['size']*100);
            $need_alert = false; $test_alert = '';
            if($free < 5){
                $need_alert = true;
                $test_alert = "Little free disk space left {$disk['id']}. Free - {$disk['free_space']}Mb / {$disk['size']}Mb.";
            }

            if($disk['free_space'] < 500){
                $need_alert = true;
                $test_alert = "Little free disk space left {$disk['id']}. Free - {$disk['free_space']}Mb / {$disk['size']}Mb.";
            }

            if($disk['free_space'] < 100){
                $need_alert = true;
                $test_alert = "There is no free disk space {$disk['id']}. Free - {$disk['free_space']}Mb / {$disk['size']}Mb. Old call records will be deleted.";
                Util::mwexec_bg("/usr/bin/php -f /etc/inc/workers/worker_remove_old_records.php");
            }

            if(!$need_alert){
                continue;
            }

            Util::sys_log_msg("STORAGE", $test_alert);
            $data = [
                'Device     - ' => "/dev/{$disk['id']}",
                'Directoire - ' => "{$disk['mounted']}",
                'Desciption - ' => $test_alert,
            ];
            // Добавляем задачу на уведомление.
            $util->add_job_to_beanstalk('notify_error_storage', $data);
        }

    }

    /**
     * Возвращает все подключенные HDD.
     * @param bool $mounted_only
     * @return array
     */
	public function get_all_hdd($mounted_only = false){
		global $g;
		$res_disks = [];

		$cd_disks= $this->cdrom_get_devices();
        $cd_disks= array_unique($cd_disks);

        // TODO Получение данных о дисках в формате JSON:
        // lsblk -J -b -o VENDOR,MODEL,SERIAL,LABEL,TYPE,FSTYPE,MOUNTPOINT,SUBSYSTEMS,NAME,UUID
        $disks 	 = $this->disk_get_devices();
		$disks   = array_unique($disks);

        $cf_disk = '';
        if(file_exists($g['varetc_path'].'/cfdevice')){
            $cf_disk = trim(file_get_contents($g['varetc_path'].'/cfdevice'));
        }

		foreach ($disks as $disk) {
		    if(in_array($disk, $cd_disks)){
		        // Это CD-ROM.
		        continue;
            }
			unset($temp_vendor, $temp_size, $original_size);
            $mounted  = Storage::disk_is_mounted("{$disk}");
            if($mounted_only == true && $mounted == false){
                continue;
            }
            $sys_disk = ($cf_disk == $disk)? true : false;
			
			$mb_size = 0;
			if(is_file("/sys/block/".$disk."/size")){
				$original_size = trim(file_get_contents("/sys/block/".$disk."/size"));
				$original_size = ($original_size*512/1024/1024);
				$mb_size = $original_size;
			}
			if($mb_size > 100){
				$temp_size 	 = sprintf("%.0f MB",$mb_size);
				$temp_vendor = $this->get_vendor_disk($disk);
				$free_space  = $this->get_free_space($disk);

				$arr_disk_info = $this->determine_format_fs($disk);
                if(count($arr_disk_info)>0){
                    $used = 0;
                    foreach ($arr_disk_info as $disk_info){
                        $used += $disk_info['used_space'];
                    }
                    if($used>0){
                        $free_space = $mb_size - $used;
                    }
                }

				$res_disks[] = [
					'id' 		=> $disk,
					'size' 		=> $mb_size,
					'size_text' => $temp_size,
					'vendor' 	=> $temp_vendor,
                    'mounted' 	=> $mounted,
                    'free_space'=> $free_space,
                    'partitions'=> $arr_disk_info,
					'sys_disk'	=> $sys_disk
				];
			}
			
		}
		
		return $res_disks;
	}

    /**
     * Проверка, смонтирован ли диск - хранилище.
     * @param string $filter
     * @param string $mount_dir
     * @return bool
     */
	static function is_storage_disk_mounted($filter='', & $mount_dir=''){
	    if('' == $filter){
            $res_disk = null;
            $filename = "{$GLOBALS['g']['varetc_path']}/storage_device";
            if(file_exists($filename)){
                $filter = file_get_contents($filename);
            }else{
                $filter = 'usbdisk1';
            }
        }
        $filter = escapeshellarg($filter);

	    $out = [];
		Util::mwexec("mount | grep {$filter} | awk '{print $3}'", $out);
        $mount_dir = trim(implode('', $out));
			
		return ($mount_dir == '') ? false : true;
	}

    /**
     * Получение идентификатора устройства.
     * @param $device
     * @return bool
     */
	public function get_uuid($device){
		if (strlen($device) == 0) {
			return false;
		}
		$res = Util::mwexec("/sbin/blkid -ofull {$device} | /bin/busybox sed -r 's/[[:alnum:]]+=/\\n&/g' | /bin/busybox grep \"^UUID\" | /bin/busybox awk -F \"\\\"\" '{print $2}' | /usr/bin/head -n 1", $output);
		if ($res == 0 && count($output)>0) {
            $result = $output[0];
		}
		else {
            $result = false;
		}

        return $result;
	}

    /**
     * Форматирование диска.
     * @param string $device
     * @param bool   $bg
     * @return mixed
     */
	private function format_disk_local_part2($device, $bg = false){
		if (is_numeric(substr($device, -1))) {
			$device_id = "";
		}else {
			$device_id = "1";
		}
		$format = 'ext4';
		$cmd    = "/sbin/mkfs.{$format} {$device}{$device_id}";
		if($bg == false){
            openlog("storage_format_disk", LOG_NDELAY, LOG_DAEMON);
            Util::mwexec("$cmd 2>&1", $out, $retval);
            syslog(LOG_NOTICE, "mkfs.{$format} returned $retval");
            closelog();
        }else{
            usleep(200000);
		    Util::mwexec_bg("$cmd");
            $retval = true;
        }

		return $retval;
	}

    /**
     * Разметка диска.
     * @param string $device
     * @param bool   $bg
     * @return mixed
     */
	public function format_disk_local($device, $bg = false){
		openlog("storage", LOG_NDELAY, LOG_DAEMON);
		// overwrite with fresh DOS partition table
		Util::mwexec("echo \"o\n" .
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

		if(false == $bg){
            sleep(1);
        }
        return $this->format_disk_local_part2($device, $bg);
	}

    /**
     * Монтирование разделов диска с базой данных настроек.
     */
	public function configure(){

	    $cf_disk = '';
        $storage_dev_file = "{$GLOBALS['g']['varetc_path']}/storage_device";
        if(file_exists($storage_dev_file)){
            unlink($storage_dev_file);
        }

        if(file_exists($GLOBALS['g']['varetc_path'].'/cfdevice')){
            $cf_disk = trim(file_get_contents($GLOBALS['g']['varetc_path'].'/cfdevice'));
        }

		$disks   = $this->get_disk_settings();
		$conf = '';
		foreach ($disks as $disk) {
		    if( "{$disk['device']}" != "/dev/{$cf_disk}" ){
                // Если это обычный диск, то раздел 1.
		        $dev = "{$disk['device']}1";
            }else{
                // Если это системный диск, то пытаемся подключить раздел 4.
                $dev = "{$disk['device']}4";
            }
		    if( !$this->hdd_exists($dev) ){
                // Диск не существует.
                continue;
            }
            if($disk['media'] == 1){
                file_put_contents($storage_dev_file, "/storage/usbdisk{$disk['id']}");
            }

            $str_uid = 'UUID='.$this->get_uuid($dev).'';
            $format_p4 = Storage::get_fs_type($dev);
			$conf .= "{$str_uid} /storage/usbdisk{$disk['id']} {$format_p4} async,rw 0 0\n";
			$is_mounted = $this->is_storage_disk_mounted("/storage/usbdisk{$disk['id']}");
			if( !$is_mounted && isset($disk['check_when_booting']) && $disk['check_when_booting'] == 1){
			    // Проверка диска.
                file_put_contents('/cf/conf/need_clean_cashe_www', '');
                Util::mwexec("/sbin/fsck.{$format_p4} -a {$dev}");
                echo "\n  - check disk {$dev}...";
                sleep(1);
            }
            $mount_point = "/storage/usbdisk{$disk['id']}";
			if (!file_exists($mount_point)) {
				Util::mwexec("mkdir -p {$mount_point}");
			}
		}
		$this->save_fstab($conf);

		$util = new Util();
        $util->create_work_dirs();
    }

    /**
     * Проверяет, существует ли диск в массиве.
     * @param $disk
     * @return bool
     */
	private function hdd_exists($disk){
	    $result = false;
	    $uid = $this->get_uuid("{$disk}");
        if(file_exists("{$disk}") && $uid !== false){
            $result = true;
        }
	    return $result;
    }

    /**
     * Генерация файла fstab. Монтирование разделов.
     * @param string $conf
     */
    public function save_fstab($conf=''){
		global $g;
		// Точка монтирования доп. дисков.
		Util::mwexec("mkdir -p /storage/");
		if(! is_file($g['varetc_path'].'/cfdevice')){
            return;
        }
        $fstab = '';
		$file_data  = file_get_contents($g['varetc_path'].'/cfdevice');
		$cf_disk    = trim($file_data);
		if('' == $cf_disk){
			return;
		}
		// $part1 	 = (strpos($cf_disk, "mmcblk") !== false)?"{$cf_disk}p1":"{$cf_disk}1"; // Boot
		$part2 	 = (strpos($cf_disk, "mmcblk") !== false)?"{$cf_disk}p2":"{$cf_disk}2"; // Offload
		$part3 	 = (strpos($cf_disk, "mmcblk") !== false)?"{$cf_disk}p3":"{$cf_disk}3"; // Conf


        $uid_part2 = 'UUID='.$this->get_uuid("/dev/{$part2}").'';
        $format_p2 = Storage::get_fs_type($part2);
        $uid_part3 = 'UUID='.$this->get_uuid("/dev/{$part3}").'';
        $format_p3 = Storage::get_fs_type($part3);

		// $fstab .= "/dev/{$part1} {$g['cf_path']} msdos ro 1 1\n"; // НЕ МОНТИРУЕМ!
		$fstab .= "{$uid_part2} /offload {$format_p2} ro 0 0\n";
		$fstab .= "{$uid_part3} {$g['cf_path']} {$format_p3} rw 1 1\n";
		$fstab .= $conf;

        file_put_contents("/etc/fstab", $fstab);
        // Дублируем для работы vmtoolsd.
        file_put_contents("/etc/mtab", $fstab);
		Util::mwexec("mount -a 2> /dev/null");
        Util::mwexec("chown -R www:www /cf/ > /dev/null 2> /dev/null");
	}

    /**
     * Получаем настройки диска из базы данных.
     * @param string $id
     * @return array
     */
	public function get_disk_settings($id=''){
        $data = array();
        if('' == $id){
            $pbxSettings = \Models\Storage::find();
            if($pbxSettings != null ){
                // Возвращаем данные до модификации.
                $data = $pbxSettings->toArray();
                /** @var \Models\Storage $pbxSettings */
                /** @var \Models\Storage $row */
                foreach ($pbxSettings as $row){
                    $row->check_when_booting = 1;
                    $row->save();
                }
            }
        }else{
            $pbxSettings = Models\Storage::findFirst("id = '$id'");
            if($pbxSettings != null ) $data = $pbxSettings->toArray();
        }
        return $data;
	}

    /**
     * Сохраняем новые данные диска.
     * @param $data
     * @param int $id
     */
	public function save_disk_settings($data, $id = 1){
		if(!is_array($data)) return;
		$disk_data = $this->get_disk_settings($id);
		if(count($disk_data) == 0){
            $uniqid = strtoupper('STORAGE-DISK-' . md5( time() ) );
		    $storage_settings = new Models\Storage();
            foreach ($data as $key => $val) {
                $storage_settings->writeAttribute("$key", "$val");
            }
            $storage_settings->writeAttribute("uniqid", $uniqid);
            $storage_settings->save();

        }else{
			$storage_settings = Models\Storage::findFirst("id = '$id'");
            foreach ($data as $key => $value){
                $storage_settings->writeAttribute("$key", "$value");
            }
            $storage_settings->save();
		}
	}

    /**
     * Прверяем является ли диск хранилищем.
     * @param $device
     * @return bool
     */
    static function is_storage_disk($device){
	    $result = false;
	    if(!file_exists("{$device}")){
	         return $result;
        }

	    $tmp_dir = "/tmp/mnt_".time();

	    mkdir($tmp_dir, 0777, true);
        $out = [];

        $storage = new Storage();
        $uid_part = 'UUID='.$storage->get_uuid("{$device}").'';
        $format = Storage::get_fs_type($device);

        Util::mwexec("mount -t {$format} {$uid_part} {$tmp_dir}", $out);
        if(trim(implode("", $out)) == "" && is_dir("{$tmp_dir}/mikopbx")){
            // $out - пустая строка, ошибок нет
            // присутствует каталог mikopbx.
            $result = true;
        }
        if(Storage::is_storage_disk_mounted($device)){
            Util::mwexec("umount {$device}");
        }

        if(!Storage::is_storage_disk_mounted($device)){
            rmdir($tmp_dir);
        }
        return $result;
    }

    /**
     * Определить формат файловой системы и размер дисков.
     * @param $device
     * @return array|bool
     */
    public function determine_format_fs($device){
        $allow_formats = ['ext2', 'ext4', 'fat', 'ntfs', 'msdos'];
        $device  = str_replace('/dev/', '', $device);
        $devices = explode(" ", trim(exec("/bin/ls /dev | grep '{$device}' | tr \"\n\" \" \"")));

        $result_data = [];
        foreach ($devices as $dev) {
            if(empty($dev) || (count($devices)>1 && $device == $dev) || is_dir("/sys/block/{$dev}")){
                continue;
            }
            $mb_size = 0;
            $path_size_info = '';
            $tmp_path = "/sys/block/{$device}/{$dev}/size";
            if(file_exists($tmp_path)) {
                $path_size_info = $tmp_path;
            }
            if(empty($path_size_info)){
                $tmp_path = "/sys/block/".substr($dev,0,3)."/{$dev}/size";
                if(file_exists($tmp_path)) {
                    $path_size_info = $tmp_path;
                }
            }

            if(!empty($path_size_info)){
                $original_size = trim(file_get_contents($path_size_info));
                $original_size = ($original_size*512/1024/1024);
                $mb_size = $original_size;
            }

            $tmp_dir = "/tmp/{$dev}_" . time();
            $out = [];

            $fs             = null;
            $need_unmount   = false;
            $mount_dir      = '';
            if(Storage::is_storage_disk_mounted("/dev/{$dev} ", $mount_dir)){
                Util::mwexec("mount | grep '/dev/{$dev}' | awk '{print $5}'", $out);
                $fs = trim(implode("", $out));
                $fs = ($fs == 'fuseblk')?'ntfs':$fs;
                $free_space = $this->get_free_space("/dev/{$dev} ");
                $used_space = $mb_size - $free_space;
            }else{
                $format = Storage::get_fs_type($device);
                if(in_array($format, $allow_formats)){
                    $fs = $format;
                }
                Storage::mount_disk($dev, $format, $tmp_dir);

                $need_unmount = true;
                $used_space = Util::get_size_file("$tmp_dir");
            }
            $result_data[] = [
                "dev"        => $dev,
                'size' 		 => round($mb_size, 2),
                "used_space" => round($used_space, 2),
                "free_space" => round($mb_size - $used_space, 2),
                "uuid"       => $this->get_uuid("/dev/{$dev} "),
                "fs"         => $fs,
            ];
            if($need_unmount){
                Storage::umount_disk($tmp_dir);
            }
        }

        return $result_data;
    }

    /**
     * Возвращает тип файловой системы блочного устройства.
     * @param $device
     * @return string
     */
    static function get_fs_type($device){
        $device  = str_replace('/dev/', '', $device);
        $out = [];
        Util::mwexec("/sbin/blkid -ofull /dev/{$device} | /bin/busybox sed -r 's/[[:alnum:]]+=/\\n&/g' | /bin/busybox grep \"^TYPE=\" | /bin/busybox awk -F \"\\\"\" '{print $2}'", $out);
        $format = implode('', $out);
        if($format == 'msdosvfat')  $format='msdos';
        return $format;
    }

    /**
     * Монтирует диск в указанный каталог.
     * @param $dev
     * @param $format
     * @param $dir
     * @return bool
     */
    static function mount_disk($dev, $format, $dir){
        if(Storage::is_storage_disk_mounted("/dev/{$dev} ")){
            return true;
        }
        if(!file_exists($dir)){
            @mkdir($dir, 0777, true);
        }
        if(!file_exists($dir)){
            Util::sys_log_msg('Storage', "Unable mount $dev $format to $dir. Unable create dir.");
            return false;
        }
        $dev  = str_replace('/dev/', '', $dev);
        if('ntfs' == $format){
            Util::mwexec("mount.ntfs-3g /dev/{$dev} {$dir}", $out);
        }else{
            $storage = new Storage();
            $uid_part = 'UUID='.$storage->get_uuid("/dev/{$dev}").'';
            Util::mwexec("mount -t {$format} {$uid_part} {$dir}", $out);
        }
        return Storage::is_storage_disk_mounted("/dev/{$dev} ");
    }

    /**
     * Монитирование каталога с удаленного сервера SFTP.
     * @param        $host
     * @param int    $port
     * @param string $user
     * @param string $pass
     * @param string $remout_dir
     * @param string $local_dir
     * @return bool
     */
    static function mount_sftp_disk($host, $port, $user, $pass, $remout_dir, $local_dir){
        if(!file_exists($local_dir)){
            mkdir($local_dir, 0777, true);
        }

        $out  = [];
        $command =  "/usr/bin/timeout -t 3 /usr/bin/sshfs -p {$port} -o nonempty -o password_stdin -o 'StrictHostKeyChecking=no' ".
                    "{$user}@{$host}:{$remout_dir} {$local_dir} << EOF\n".
                    "{$pass}\n".
                    "EOF\n";
        Util::mwexec($command,$out);
        $response = trim(implode('', $out));
        if('Terminated' == $response){
            // Удаленный сервер не ответил / или не корректно указан пароль.
            unset($response);
        }

        return Storage::is_storage_disk_mounted("$local_dir ");
    }

    /**
     * Монитирование каталога с удаленного сервера FTP.
     * @param        $host
     * @param        $port
     * @param        $user
     * @param        $pass
     * @param string $remout_dir
     * @param        $local_dir
     * @return bool
     */
    static function mount_ftp($host, $port, $user, $pass, $remout_dir, $local_dir){
        if(!file_exists($local_dir)){
            mkdir($local_dir, 0777, true);
        }
        $out  = [];

        // Собираем строку подключения к ftp.
        $auth_line = '';
        if(!empty($user)){
            $auth_line.='user="'.$user;
            if(!empty($pass)){
                $auth_line.=":{$pass}";
            }
            $auth_line.='",';
        }

        $connect_line = 'ftp://'.$host;
        if(!empty($port)){
            $connect_line.=":{$port}";
        }
        if(!empty($remout_dir)){
            $connect_line.="$remout_dir";
        }

        $command =  "/usr/bin/timeout -t 3 /usr/bin/curlftpfs  -o allow_other -o {$auth_line}fsname={$host} {$connect_line} {$local_dir}";
        Util::mwexec($command,$out);
        $response = trim(implode('', $out));
        if('Terminated' == $response){
            // Удаленный сервер не ответил / или не корректно указан пароль.
            unset($response);
        }

        return Storage::is_storage_disk_mounted("$local_dir ");
    }

    /**
     * Размонтирует диск. Удаляет каталог в случае успеха.
     * @param $dir
     * @return bool
     */
    static function umount_disk($dir){
        if(Storage::is_storage_disk_mounted("$dir")){
            Util::mwexec("/etc/rc/shell_functions.sh 'killprocesses' '$dir' -TERM 0");
            Util::mwexec("umount {$dir}");
        }
        $result = !Storage::is_storage_disk_mounted("$dir");
        if($result && file_exists($dir)){
            // Если диск не смонтирован, то удаляем каталог.
            Util::mwexec("rm -rf '{$dir}'");
        }
        return $result;
    }

    /**
     * Запускает процесс форматирования диска.
     * @param $dev
     * @return array|bool
     */
    static function mkfs_disk($dev){
        if(!file_exists($dev)){
            $dev = "/dev/{$dev}";
        }
        if(!file_exists($dev)) {
            return false;
        }
        $dir = '';
        Storage::is_storage_disk_mounted("$dev", $dir);

        if(empty($dir) || Storage::umount_disk($dir)){
            // Диск размонтирован.
            $st = new Storage();
            // Будет запущен процесс:
            $st->format_disk_local($dev, true);
            sleep(1);
            return (Storage::status_mkfs($dev) == 'inprogress');
        }else{
            // Ошибка размонтирования диска.
            return false;
        }
    }

    /**
     * Возвращает текущий статус форматирования диска.
     * @param $dev
     * @return string
     */
    static function status_mkfs($dev){
        if(!file_exists($dev)){
            $dev = "/dev/{$dev}";
        }
        $out = array();
        Util::mwexec("ps -A -f | grep {$dev} | grep mkfs | grep -v grep", $out);
        $mount_dir = trim(implode('', $out));

        return ($mount_dir == '') ? 'ended' : 'inprogress';
    }
}
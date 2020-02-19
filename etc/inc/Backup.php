<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

use Models\BackupRules;

require_once 'globals.php';

class Backup {
    private $id;
    private $dirs;
    private $dirs_mem;
    private $file_list;
    private $result_file;
    private $result_dir;
    private $progress_file;
    private $progress_file_recover;
    private $config_file;
    private $options;
    private $options_recover_file;
    private $progress=0;
    private $type='img'; // img | zip

    public function __construct($id, $options=null){
        $this->dirs      = PBX::get_asterisk_dirs();
        $this->dirs_mem  = PBX::get_asterisk_dirs_mem();
        // Проверим особенность бекапа на сетевой диск.
        Util::mwexec("du /storage/*/{$id}/flist.txt -d 0 2> /dev/null | /bin/busybox awk '{print $2}'", $out);
        if(($out[0] ?? false) && file_exists($out[0])){
            $this->dirs['backup'] = dirname($out[0], 2);
        }elseif (is_array($options) && isset($options['backup'])){
            // Переопределяем каталог с бекапом.
            $this->dirs['backup'] = $options['backup'];
        }
        $this->id        = $id;
        $b_dir="{$this->dirs['backup']}/{$this->id}";

        if(!is_dir($b_dir) && mkdir($b_dir, 0755, true) && !is_dir($b_dir)){
            Util::sys_log_msg('Backup', 'Can not create dir '.$b_dir);
        }

        if(isset($options['type'])){
            $this->type = $options['type'];
        }
        if(file_exists("{$this->dirs['backup']}/{$this->id}/resultfile.zip")){
            $this->type = 'zip';
        }

        $this->file_list      = "{$this->dirs['backup']}/{$this->id}/flist.txt";
        $this->result_file    = "{$this->dirs['backup']}/{$this->id}/resultfile.{$this->type}";
        $this->result_dir     = "{$this->dirs['backup']}/{$this->id}/mnt_point";
        $this->progress_file  = "{$this->dirs['backup']}/{$this->id}/progress.txt";
        $this->config_file    = "{$this->dirs['backup']}/{$this->id}/config.json";
        $this->options_recover_file= "{$this->dirs['backup']}/{$this->id}/options_recover.json";
        $this->progress_file_recover = "{$this->dirs['backup']}/{$this->id}/progress_recover.txt";

        if((!is_array($options) || $options === null) && file_exists($this->config_file)){
            $this->options = json_decode(file_get_contents($this->config_file), true);
        }else{
            $this->options = $options;
        }

        if(!is_array($this->options) || $this->options === null){
            $this->options = [
                'backup-config'     => '1',
                'backup-records'    => '1',
                'backup-cdr'        => '1',
                'backup-sound-files'=> '1'
            ];
        }
        if(!file_exists($this->config_file) && FALSE === @file_put_contents($this->config_file, json_encode($this->options), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)){
            Util::sys_log_msg('Backup', 'Failed create file '.$this->config_file);
        }
    }

    /**
     * Создает список файлов к бекапу.
     */
    private function create_file_list():bool {
        global $g;

        try{
            $result = @file_put_contents($this->file_list, '');
        }catch (Exception $e){
            Util::sys_log_msg('Backup', $e->getMessage());
            $result = false;
        }
        if($result === false || !file_exists($this->file_list)){
            Util::sys_log_msg('Backup', 'Failed to create file '.$this->file_list);
            return $result;
        }

        $flist = '';
        if(($this->options['backup-config']??'') === '1'){
            file_put_contents($this->file_list, 'backup-config:'.$g['pt1c_db_path']."\n", FILE_APPEND);
            Util::mwexec("find {$this->dirs['custom_modules']}", $out);
            foreach ($out as $filename){
                $flist.= 'backup-config:'.$filename."\n";
            }
        }
        if(($this->options['backup-cdr']??'') === '1'){
            file_put_contents($this->file_list, 'backup-cdr:'.Cdr::getPathToDB()."\n", FILE_APPEND);
        }

        file_put_contents($this->file_list, $this->file_list."\n",      FILE_APPEND);
        file_put_contents($this->file_list, $this->config_file."\n",    FILE_APPEND);

        if(($this->options['backup-sound-files']??'') === '1'){
            Util::mwexec("find {$this->dirs['media']} -type f",$out);
            foreach ($out as $filename){
                $flist.= 'backup-sound-files:'.$filename."\n";
            }
        }
        if(($this->options['backup-records']??'') === '1'){
            Util::mwexec("find {$this->dirs['astspoolpath']} -type f -name *.mp3", $out);
            foreach ($out as $filename){
                $flist.= 'backup-records:'.$filename."\n";
            }
        }
        file_put_contents($this->file_list, $flist, FILE_APPEND);

        return true;
    }

    /**
     * Возвращает предполагаемый размер каталогов для бекапа.
     * @return array
     */
    public static function get_estimated_size() :array {
        global $g;
        $arr_size = [];
        $dirs = PBX::get_asterisk_dirs();
        $arr_size['backup-sound-files'] = Util::get_size_file($dirs['media']);
        $arr_size['backup-records']     = Util::get_size_file($dirs['astspoolpath']);
        $arr_size['backup-cdr']         = Util::get_size_file(Cdr::getPathToDB());

        $backup_config = Util::get_size_file($g['pt1c_db_path']);
        $backup_config+= Util::get_size_file($dirs['custom_modules']);
        $arr_size['backup-config']      = $backup_config;

        foreach ($arr_size as $key => $value){
            // Есть какие то аномалии с преобразование значение в json
            // Без этого костыля есть проблемы с округлением.
            $arr_size[$key] = trim(1*$value);
        }
        return $arr_size;
    }

    /**
     * Создает файл образа для бекапа. Резервирует место под резервную копию.
     */
    private function create_img_file():void {
        // Создаем директорию монтирования.
        if(!is_dir($this->result_dir) && mkdir($this->result_dir) && !is_dir($this->result_dir)){
            Util::sys_log_msg('Backup', 'Can not create dir '. $this->result_dir);
        }
        if( !file_exists($this->result_file) ) {
            // Оценим размер бекапа.
            $result_size = 0;
            $arr_size = self::get_estimated_size();
            foreach ($this->options as $key => $enable) {
                if (trim($enable) === '1') {
                    $result_size += $arr_size[$key];
                }
            }
            // Округляем в большую сторону.
            $result_size = $result_size < 1?1:round($result_size);
            $tmp_name    = $this->dirs['tmp'].'/'.Util::generateRandomString();
            // Создаем образ файловой системы.
            $res = Util::mwexec("/bin/dd if=/dev/zero of={$tmp_name} bs=1 count=0 seek={$result_size}M");
            if ($res !== 0) {
                Util::sys_log_msg('Backup', 'Error creating img file...');
            }

            // Создаем разметку файловой системы.
            $res = Util::mwexec("/sbin/mke2fs -m0 -L backup -F {$tmp_name}");
            if ($res !== 0) {
                Util::sys_log_msg('Backup', 'Error create the layout of the file system... '.$tmp_name);
                // throw new Exception('Error create the layout of the file system...');
            }
            // Тюним.
            Util::mwexec("/sbin/tune2fs -c0  {$tmp_name}");
            Util::mwexec("cp '{$tmp_name}' '{$this->result_file}' ");
            Util::mwexec("rm -rf  '{$tmp_name}'");
        }
        // Монтируем.
        if(! Storage::disk_is_mounted($this->result_file, '')) {
            $res = Util::mwexec("/bin/mount -o loop {$this->result_file} {$this->result_dir}");
            if ($res > 1) {
                Util::sys_log_msg('Backup', 'File system mount error...');
            }

        }
    }

    /**
     * Добавляем файл к архиву.
     * @param $filename
     */
    private function add_file_to_arhive($filename):void {
        if(!file_exists($filename)) {
            return;
        }
        if($this->type==='img'){
            $this->create_img_file();
            $res_dir = dirname($this->result_dir.$filename);
            Util::mwexec("mkdir -p $res_dir");
            if(in_array(basename($filename), ['mikopbx.db', 'cdr.db']) ){
                // Выполняем копирование через dump.
                // Наиболее безопасный вариант.
                Util::mwexec("/usr/bin/sqlite3 '{$filename}' .dump | /usr/bin/sqlite3 '{$this->result_dir}{$filename}' ", $out);
            }else{
                // Просто копируем файл.
                Util::mwexec("/bin/cp '{$filename}' '{$this->result_dir}{$filename}' ", $out);
            }
        }else{
            Util::mwexec("7za a -tzip -spf '{$this->result_file}' '{$filename}'", $out);
        }
    }

    /**
     * Извлечь файл из архива.
     * @param string $filename
     * @param null | string   $out
     * @return bool
     */
    public function extract_file($filename='', &$out=null) :bool {
        $arr_out = [];

        $result_file = $filename;
        $tmp_path    = '/var/asterisk/';
        $mem_monitor_dir = $this->dirs_mem['astspoolpath'].'/mikopbx/voicemailarchive/monitor';
        $monitor_dir     = substr(Storage::get_monitor_dir(), 0, -1);
        if(strpos($filename, $tmp_path) === 0){
            $var_search = [
                $mem_monitor_dir,
                $this->dirs_mem['media'],
                $this->dirs_mem['astlogpath'],
                $this->dirs_mem['backup']
            ];
            $var_replace= [
                $monitor_dir,
                $this->dirs['media'],
                $this->dirs['astlogpath'],
                $this->dirs['backup']
            ];
            $result_file = str_replace($var_search, $var_replace, $filename);
        }

        $file_dir = dirname($filename);
        if(!file_exists($file_dir)){
            Util::mwexec('mkdir -p '.escapeshellcmd($file_dir) );
        }
        $file_dir = dirname($result_file);
        if(!file_exists($file_dir)){
            Util::mwexec('mkdir -p '.escapeshellcmd($file_dir) );
        }

        if($this->type==='img') {
            if(! Storage::disk_is_mounted($this->result_file, '')) {
                Util::mwexec("/bin/mount -o loop {$this->result_file} {$this->result_dir}");
            }
            if(in_array(basename($filename), ['mikopbx.db', 'cdr.db']) ){
                $sed_command = '';
                if($result_file !== $filename){
                    $sed_command = ' | sed \'s/'.str_replace('/', '\/', $mem_monitor_dir).'/'.str_replace('/', '\/', $monitor_dir).'/g\'';
                    $sed_command .= ' | sed \'s/'.str_replace('/', '\/', $this->dirs_mem['media']).'/'.str_replace('/', '\/', $this->dirs['media']).'/g\'';
                }
                // Выполняем копирование через dump.
                // Наиболее безопасный вариант.
                Util::mwexec("rm -rf {$result_file}* ");
                Util::mwexec("/usr/bin/sqlite3 '{$this->result_dir}{$filename}' .dump $sed_command | /usr/bin/sqlite3 '{$result_file}' ", $arr_out);
                Util::mwexec("chown -R www:www {$result_file}* > /dev/null 2> /dev/null");

            }else{
                // Просто копируем файл.
                Util::mwexec("/bin/cp '{$this->result_dir}{$filename}' '{$result_file}'", $arr_out);
            }
        }else {
            Util::mwexec("7za e -y -r -spf '{$this->result_file}' '{$filename}'", $arr_out);
            if($filename !== $result_file && file_exists($filename)){
                Util::mwexec("mv '{$filename}' '{$result_file}'", $arr_out);
            }
            if(in_array(basename($filename), ['mikopbx.db', 'cdr.db']) ){
                Util::mwexec("chown -R www:www {$result_file}* > /dev/null 2> /dev/null");
            }
        }
        $out = implode(' ', $arr_out);
        return (strpos($out, 'ERROR') === FALSE);
    }

    /**
     * Распаковывает вспомогательные данные из архива резервной копии.
     * @param  array $data
     * @return array
     */
    public static function unpack_uploded_img_conf($data):array {
        $result['result']     = 'Success';
        $result['id']         = $data['dir_name'];
        $result['extension']  = $data['extension'];
        if($data['extension'] === 'img'){
            if(!file_exists($data['res_file']??'')){
                $result['result'] = 'ERROR';
                $result['data'] = "Backup file {$data['res_file']} not found";
                Util::sys_log_msg('Backup_unpack_conf_img', $result['data']);
                return $result;
            }

            $res = Util::mwexec("/bin/mount -o loop {$data['res_file']} {$data['mnt_point']}");
            if($res !== 0){
                $result['result'] = 'ERROR';
                $result['data'] = "Fail mount {$data['res_file']}... on loop device...";
                Util::sys_log_msg('Backup_unpack_conf_img', $result['data']);
                return $result;
            }

            // Если бекап выполнялся в каталоге оперативной памяти:
            $path_b_dir = "{$data['mnt_point']}/var/asterisk/backup/{$data['dir_name']}";
            if(!file_exists($path_b_dir)){
                // Бекап выполнялся на диск - хранилище
                $path_b_dir = "{$data['mnt_point']}/storage/usbdisk[1-9]/mikopbx/backup/{$data['dir_name']}";
            }
            Util::mwexec("du {$data['mnt_point']}/storage/*/{$data['dir_name']}/flist.txt -d 0 2> /dev/null | /bin/busybox awk '{print $2}'", $out);
            if(($out[0] ?? false) && file_exists($out[0])){
                // бекап выполнялся на сетевой диск.
                $path_b_dir = dirname($out[0]);
            }

            if(!file_exists($path_b_dir)){
                Util::mwexec("du {$data['mnt_point']}/storage/usbdisk[1-9]/mikopbx/backup/*/flist.txt -d 0 2> /dev/null | /bin/busybox awk '{print $2}'", $out);
                if(($out[0] ?? false) && file_exists($out[0])){
                    // бекап выполнялся на сетевой диск.
                    $path_b_dir       = dirname($out[0]);
                    $new_id           = basename($path_b_dir);
                    if($data['dir_name'] !== $new_id){
                        $result['new_id'] = $new_id;
                    }
                }
            }

            $res = Util::mwexec("/bin/cp {$path_b_dir}/* {$data['backupdir']}/{$data['dir_name']}");

            Util::mwexec("/bin/umount {$data['res_file']}");
            if(isset($result['new_id'])){
                $res = Util::mwexec("/bin/mv {$data['backupdir']}/{$data['dir_name']} {$data['backupdir']}/{$result['new_id']}");
                $data['dir_name'] = $result['new_id'];
            }
            if($res !== 0){
                $result['result']   = 'ERROR';
                $result['data']     = 'Fail mount cp data from loop device...';
                Util::sys_log_msg('Backup_unpack_conf_img', $result['data']);
            }

            if( ! file_exists("{$data['backupdir']}/{$data['dir_name']}/flist.txt")   ||
                ! file_exists("{$data['backupdir']}/{$data['dir_name']}/config.json")){
                $result['result'] = 'ERROR';
                $result['data']   = 'Broken backup file';
            }
            if($result['result'] === 'ERROR'){
                unlink($data['res_file']);
            }
        }elseif($data['extension'] === 'zip'){
            file_put_contents("{$data['backupdir']}/{$data['dir_name']}/progress.txt", '0');

            self::static_extract_file($data['dir_name'], $data['res_file'], "{$data['backupdir']}/{$data['dir_name']}/flist.txt");
            self::static_extract_file($data['dir_name'], $data['res_file'], "{$data['backupdir']}/{$data['dir_name']}/progress.txt");
            self::static_extract_file($data['dir_name'], $data['res_file'], "{$data['backupdir']}/{$data['dir_name']}/config.json");
        }
        return $result;
    }

    /**
     * Извлеч файл из архива.
     * @param $id
     * @param $arh
     * @param $filename
     */
    public static function static_extract_file($id, $arh, $filename):void {
        $type = Util::get_extension_file($arh);
        if($type==='img') {
            $result_dir = basename($arh).'/mnt_point';
            if(! Storage::disk_is_mounted($arh, '')) {
                Util::mwexec("/bin/mount -o loop {$arh} {$result_dir}");
            }
            Util::mwexec("du /storage/*/{$id} -d 0 2> /dev/null | /bin/busybox awk '{print $2}'", $out);
            if(($out[0] ?? false) && file_exists($out[0])){
                $src_file = $out[0];
            }else{
                $src_file = "{$result_dir}{$filename}";
            }
            Util::mwexec("/bin/cp '{$src_file}' '{$filename}'", $arr_out);
            Util::mwexec("/bin/umount $arh");
        }else {
            Util::mwexec("7za e -y -r -spf {$arh} {$filename}");
            if(!file_exists($filename)){
                $command_status = Util::mwexec("7za l {$arh} | grep '".basename($filename)."' | /bin/busybox awk '{print $6}'", $out);
                if($command_status === 0){
                    $path_to_file = implode('', $out);

                    $file_dir = dirname($path_to_file);
                    if(!file_exists($file_dir)){
                        Util::mwexec('mkdir -p '.escapeshellcmd($file_dir) );
                    }
                    $file_dir = dirname($filename);
                    if(!file_exists($file_dir)){
                        Util::mwexec('mkdir -p '.escapeshellcmd($file_dir) );
                    }
                    Util::mwexec("7za e -y -r -spf {$arh} {$path_to_file}");
                    Util::mwexec("mv $path_to_file $filename");
                }
            }

        }
    }

    /**
     * Создает файл бекапа.
     * @return array
     */
    public function create_arhive():array {
        if(!file_exists("{$this->dirs['backup']}/{$this->id}")){
            return ['result' => 'ERROR', 'message' => 'Unable to create directory for the backup.'];
        }
        $result = $this->create_file_list();
        if(!$result){
            return ['result' => 'ERROR', 'message' => 'Unable to create file list. Failed to create file.'];
        }

        if(file_exists($this->progress_file)){
            $file_data  = file_get_contents($this->progress_file);
            $data       = explode('/', $file_data);
            $this->progress = trim($data[0])*1;
        }
        if(!file_exists($this->file_list)){
            return ['result' => 'ERROR', 'message' => 'File list not found.'];
        }
        $lines = file($this->file_list);
        if($lines === FALSE){
            return ['result' => 'ERROR', 'message' => 'File list not found.'];
        }
        $count_files = count($lines);
        file_put_contents($this->progress_file, "{$this->progress}/{$count_files}");
        while ($this->progress < $count_files){
            $filename_data = trim($lines[$this->progress]);
            if(strpos($filename_data,':')===false){
                $filename = $filename_data;
            }else{
                $filename = (explode(':', $filename_data))[1];
            }
            if(is_dir($filename) === FALSE){
                $this->add_file_to_arhive($filename);
            }

            $this->progress++;
            if($this->progress % 10 === 0){
                file_put_contents($this->progress_file, "{$this->progress}/{$count_files}");
            }
        }

        file_put_contents($this->progress_file, "{$this->progress}/{$count_files}");
        $this->add_file_to_arhive($this->progress_file);

        if(Storage::disk_is_mounted($this->result_file, '')){
            Util::mwexec("/bin/umount $this->result_file");
        }

        return ['result' => 'Success', 'count_files' => $count_files];
    }

    /**
     * Возвращает путь к файлу резервной копии.
     * @return string
     */
    public function get_result_file():string {

        if(!file_exists($this->result_file)){
            $BackupRules = Models\BackupRules::find('enabled="1"');
            foreach ($BackupRules as $res){
                $backup_dir = '/storage/'.$res->ftp_host.'.'.$res->ftp_port;
                $filename = "{$backup_dir}/{$this->id}/resultfile";
                if(file_exists("{$filename}.zip")){
                    $this->result_file = "{$filename}.zip";
                }
                if(file_exists("{$filename}.img")){
                    $this->result_file = "{$filename}.img";
                }
            }
        }

        return $this->result_file;
    }

    /**
     * Возвращает список доступных резервных копий.
     * @param string $backup_dir
     * @return array
     */
    public static function list_backups($backup_dir=''):array {
        $result = array(
          'result'  => 'Success'
        );

        $result['data'] = [];

        // Проверка каталогов FTP / SFTP бекапа:
        if(empty($backup_dir)){
            self::list_backups_ftp($result['data']);
        }

        $dirs = PBX::get_asterisk_dirs();
        if(!empty($backup_dir)){
            $dirs['backup'] = $backup_dir;
        }

        if(!is_dir($dirs['backup'])){
            return $result;
        }
        $entries = scandir($dirs['backup']);
        foreach($entries as $entry) {
            $base_filename = basename($entry);
            if($base_filename === '.' || $base_filename === '..'){
                continue;
            }
            $filename      = "{$dirs['backup']}/{$base_filename}/resultfile.zip";
            if(!file_exists($filename)) {
                $filename      = "{$dirs['backup']}/{$base_filename}/resultfile.img";
            }

            $file_progress = "{$dirs['backup']}/{$base_filename}/progress.txt";
            if(file_exists($file_progress)){
                $size = 0;
                if(file_exists($filename)){
                    $size = round(filesize($filename) / 1024 / 1024, 2); // размер в мегабайтах.
                }
                // Получим данные по прогрессу и количеству файлов.
                $file_data  = file_get_contents($file_progress);
                $data       = explode('/', $file_data);
                $progress   = (count($data)>0 && is_numeric($data[0]) )?trim($data[0])*1:0;
                $total      = (count($data)>1 && is_numeric($data[1]) )?trim($data[1])*1:0;
                $config_file="{$dirs['backup']}/{$base_filename}/config.json";

                if(file_exists("{$dirs['backup']}/{$base_filename}/progress_recover.txt")){
                    $file_data  = file_get_contents("{$dirs['backup']}/{$base_filename}/progress_recover.txt");
                    $data       = explode('/', $file_data);
                    $progress_recover   = (count($data)>0)?trim($data[0])*1:0;
                    if($total === 0 ){
                        $total          = (count($data)>1)?trim($data[1])*1:0;
                    }
                }else{
                    $progress_recover = '';
                }

                $config = null;
                if(file_exists($config_file)){
                    $config = json_decode(file_get_contents($config_file), true);
                }
                // Вычислим timestamp.
                $arr_fname = explode('_', $base_filename);
                $pid         = self::getPID("{$base_filename} backup");
                $pid_recover = self::getPID("{$base_filename} recover");
                $result['data'][] = [
                    'date'      => $arr_fname[1] ?? time(),
                    'size'      => $size,
                    'progress'  => $progress,
                    'total'     => $total,
                    'config'    => $config,
                    'pid'       => $pid,
                    'id'        => $base_filename,
                    'progress_recover'  => $progress_recover,
                    'pid_recover'       => $pid_recover
                ];
            }
        }

        return $result;
    }

    /**
     * Получаем данные по резервным копиям с SFTP / FTP ресурсов.
     * @param $data
     */
    public static function list_backups_ftp(& $data):void {
        $dirs = PBX::get_asterisk_dirs();

        $tmp_data = [$data];

        $BackupRules = Models\BackupRules::find('enabled="1"');
        foreach ($BackupRules as $res){
            $backup_dir = '/storage/'.$res->ftp_host.'.'.$res->ftp_port;
            $disk_mounted = Storage::is_storage_disk_mounted("$backup_dir ");
            if(!$disk_mounted){
                if($res->ftp_sftp_mode === '1'){
                    $disk_mounted = Storage::mount_sftp_disk($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
                }else{
                    $disk_mounted = Storage::mount_ftp($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
                }
            }
            if(!$disk_mounted){
                continue;
            }

            // Проверим, не является ли удаленный диск локальным.
            $test_data = md5(time());
            file_put_contents("{$backup_dir}/test.tmp", $test_data);
            if(file_exists("{$dirs['backup']}/test.tmp")){
                $test_data_res = file_get_contents("{$dirs['backup']}/test.tmp");
                if($test_data_res === $test_data){
                    unlink("{$backup_dir}/test.tmp");
                    // Это локальный диск подключен по SFTP. Не нужно обрабатывать.
                    continue;
                }
            }
            // Чистим временный файл.
            unlink("{$backup_dir}/test.tmp");

            $out  = [];
            $command =  "/usr/bin/timeout -t 3 ls -l {$backup_dir}";
            Util::mwexec($command,$out);
            $response = trim(implode('', $out));
            if('Terminated' === $response){
                // Удаленный сервер не ответил / или не корректно указан пароль.
                continue;
            }
            $result = self::list_backups($backup_dir);
            foreach ($result['data'] as &$b){
                $b['m_BackupRules_id'] = $res->id;
                $b['m_BackupRules_host'] = $res->ftp_host;
                $b['m_BackupRules_port'] = $res->ftp_port;
            }
            unset($b);
            $tmp_data[] = $result['data'];
        }

        $data = array_merge(...$tmp_data);
    }

    /**
     * Старт бекапа.
     * @param  array | null $options
     * @return array
     */
    public static function start($options=null):array {
        global $g;
        $result = [];
        $id = 'backup_'.time();
        if($options !== null){
            if(isset($options['id'])){
                $id = $options['id'];
            }
            // Инициализируем настройки резервного копирования.
            $b = new Backup($id, $options);
            unset($b);

        }
        $command = "php -f {$g['pt1c_inc_path']}/workers/worker_backup.php";
        Util::process_worker($command, "$id backup", 'worker_backup', 'start');
        $result['result']   = 'Success';
        $result['data']     = $id;

        return $result;
    }

    /**
     * Старт бекапа.
     * @param  string     $id
     * @param  $options
     * @return array
     */
    public static function start_recover($id, $options=null):array {
        global $g;
        $result = [];

        if(empty($id)){
            $result['result'] = 'Error';
            $result['message'] = 'ID is empty';
            return $result;
        }
        $b = new Backup($id);
        $b->save_options_recover_file($options);

        $command = "php -f {$g['pt1c_inc_path']}/workers/worker_recover.php";
        Util::process_worker($command, "$id recover", 'worker_recover', 'start');
        $result['result']   = 'Success';
        $result['data']     = $id;

        return $result;
    }

    /**
     * Приостановить резервное копирование.
     * @param $id
     * @return array
     */
    public static function stop($id):array {
        global $g;
        $result = [];
        $command = "php -f {$g['pt1c_inc_path']}/workers/worker_backup.php";
        Util::process_worker($command, "$id backup", 'worker_backup', 'stop');
        $result['result']   = 'Success';
        $result['data']     = $id;

        return $result;
    }

    /**
     * Проверяет, активен ли процесс резервного копирования.
     * @param $id
     * @return string
     */
    public static function getPID($id):string {
        return Util::get_pid_process($id);
    }

    /**
     * Удаление резервной копии.
     * @param $id
     * @return array
     */
    public static function remove($id):array {
        if(empty($id)){
            $result['result'] = 'Error';
            $result['message'] = 'ID is empty';
            return $result;
        }
        $result = [];
        $b_dir  = self::get_backup_dir()."/{$id}";
        $b_dirs = [];
        if(file_exists($b_dir)){
            $b_dirs[] = $b_dir;
        }
        $list   = self::list_backups();
        foreach ($list['data'] as $backup_data){
            if($id === $backup_data['id'] && isset($backup_data['config']['backup'])){
                $b_dir  = $backup_data['config']['backup']."/{$id}";
                if(file_exists($b_dir)){
                    $b_dirs[] = $b_dir;
                }
            }
        }

        $BackupRules = Models\BackupRules::find('enabled="1"');
        foreach ($BackupRules as $res) {
            $b_dir = '/storage/' . $res->ftp_host . '.' . $res->ftp_port."/{$id}";
            if(file_exists($b_dir)){
                $b_dirs[] = $b_dir;
            }
        }

        if(count($b_dirs) === 0){
            $result['result'] = 'Error';
            $result['message'] = 'File not found';
            return $result;
        }

        $ret = Util::mwexec('rm -rf '.implode(' ', $b_dirs) );
        clearstatcache();

        $result['result'] = $ret !== 0 ?'Error':'Success';
        return $result;
    }

    /**
     * Сохраняем настройки восстановления.
     * @param $options
     */
    public function save_options_recover_file($options):void {
        if($options === null && file_exists($this->options_recover_file)){
            // Удаляем ненужный файл настроек.
            unlink($this->options_recover_file);
        }

        if($options!==null){
            // Сохраняем настройки. Файл будет использоваться фоновым процессом.
            file_put_contents($this->options_recover_file, json_encode($options, JSON_UNESCAPED_SLASHES));
        }
    }

    /**
     * Восстановление из резервной копиии.
     * @return array
     */
    public function recover_with_progress():array {
        if(!Storage::is_storage_disk_mounted()){
            return ['result' => 'ERROR', 'message' => 'Storage is not mounted.'];
        }
        $options = null;
        if(file_exists($this->options_recover_file)){
            $options = json_decode(file_get_contents($this->options_recover_file), true);
        }

        if(!file_exists($this->file_list)){
            return ['result' => 'ERROR', 'message' => 'File list not found.'];
        }
        $lines = file($this->file_list);
        if($lines === FALSE){
            return ['result' => 'ERROR', 'message' => 'File list not read.'];
        }

        if(file_exists($this->progress_file_recover)){
            // Получим текущий прогресс.
            $file_data  = file_get_contents($this->progress_file_recover);
            $data       = explode('/', $file_data);
            $this->progress = trim($data[0])*1;
        }

        $count_files = count($lines);
        if($this->progress === $count_files){
            $this->progress = 0;
        }

        file_put_contents($this->progress_file_recover, "{$this->progress}/{$count_files}");
        while ($this->progress < $count_files){
            $filename_data = trim($lines[$this->progress]);
            if(strpos($filename_data,':')===false){
                $section  = ''; // Этот файл будет восстановленр в любом случае.
                $filename = $filename_data;
            }else{
                $tmp_data = explode(':', $filename_data);
                $section  = $tmp_data[0] ?? '';
                $filename = $tmp_data[1] ?? '';
            }

            $this->progress++;
            if(in_array(basename($filename),['flist.txt', 'config.json'])){
                continue;
            }

            if( $section!=='' && is_array($options) && !isset($options[$section]) ){
                // Если секция указана, и она не определена в массиве опций,
                // то не восстанавливаем файл.
                unset($filename);
            }else{
                $this->extract_file($filename);
            }
            if($this->progress % 10 === 0){
                file_put_contents($this->progress_file_recover, "{$this->progress}/{$count_files}");
            }
        }
        file_put_contents($this->progress_file_recover, "{$this->progress}/{$count_files}");

        if(Storage::disk_is_mounted($this->result_file, '')){
            Util::mwexec("umount $this->result_file");
        }
        Cdr::set_permit_to_db();

        if(isset($options['backup-config']) && $options['backup-config'] === '1') {
            System::reboot_sync(false);
        }
        return ['result' => 'Success', 'count_files' => $count_files];
    }

    /**
     * Возвращает полный путь к директории с резервными копиями.
     * @return string
     */
    public static function get_backup_dir():string {
        $dirs = PBX::get_asterisk_dirs();
        return $dirs['backup'];
    }

    /**
     * @param $mast_have
     */
    public static function create_cron_tasks(& $mast_have) :void {
        global $g;

        $commands = Models\BackupRules::find('enabled="1"');
        foreach ($commands as $cmd){
            $day = ('0' === $cmd->every)?'*':$cmd->every;
            $arr_time = explode(':', $cmd->at_time);
            if(count($arr_time)!==2){
                $h = '*';
                $m = '*';
            }else{
                $h = $arr_time[0];
                if($h === '0'){
                    $h = '*';
                }
                $m = $arr_time[1];
                $m = (strpos($m,'0')===0)?substr($m,1,1):$m;
                if($m === '0'){
                    $m = '0';
                }
            }

            if('*' === $h && '*' === $m && '*' === $day){
                // Не корректно описано расписание.
                continue;
            }

            $command     = "/usr/bin/nohup /usr/bin/php -f {$g['pt1c_inc_path']}/workers/worker_backup.php ";
            $params      = "none backup {$cmd->id} > /dev/null 2>&1 &";
            $mast_have[] = "{$m} {$h} * * {$day} {$command} {$params}\n";
        }
    }

    public static function start_scheduled():array {
        global $g;
        $commands = Models\BackupRules::find('enabled="1"');
        $queue_commands = [];
        foreach ($commands as $cmd){
            $command     = "/usr/bin/nohup /usr/bin/php -f {$g['pt1c_inc_path']}/workers/worker_backup.php ";
            $params      = "none backup {$cmd->id} > /dev/null 2>&1 &";
            $queue_commands[] = "{$command} {$params}\n";
        }
        Util::mwexec_commands($queue_commands);
        if(count($queue_commands) === 0){
            $result['result'] = 'Error';
        }else{
            $result['result'] = 'Success';
        }

        return $result;
    }

    /**
     * Проверка возможности подключения диска.
     * @param $id
     * @return array
     */
    public static function check_storage_ftp($id):array {
        $result = [];
        /** @var Models\BackupRules $res */
        $res = BackupRules::findFirst("id='{$id}'");
        if(!$res){
            return ['result' => 'Error', 'message' => 'Backup rule not found.'];
        }
        $backup_dir = '/storage/'.$res->ftp_host.'.'.$res->ftp_port;
        /** @var Storage::is_storage_disk_mounted $disk_mounted */
        $disk_mounted = Storage::is_storage_disk_mounted("$backup_dir ");
        $disk_mounted_start = $disk_mounted;
        if(!$disk_mounted){
            if($res->ftp_sftp_mode === '1'){
                $disk_mounted = Storage::mount_sftp_disk($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
            }else{
                $disk_mounted = Storage::mount_ftp($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
            }
        }
        if(!$disk_mounted){
            return ['result' => 'Error', 'message' => 'Failed to mount backup disk...'];
        }
        $result['result']   = 'Success';
        if(!$disk_mounted_start){
            Storage::umount_disk($backup_dir);
        }
        return $result;
    }
}
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2019
 */

namespace Workers;
require_once 'globals.php';

class Downloader{
    private $old_memory_limit;
    private $progress = 0;
    private $settings;
    private $progress_file = '';
    private $error_file = '';
    private $file_size = 0;

    /**
     * Downloader constructor.
     * @param string $settings
     */
    function __construct($settings){
        if(file_exists($settings)){
            $this->settings = json_decode(file_get_contents($settings), true);
        }
        $this->old_memory_limit = ini_get('memory_limit');
        register_shutdown_function([$this, 'ShutdownHandler']);
        ini_set('memory_limit', "300M");
        if ('upgrade_online' == $this->settings['action'] ){
            $mod_dir = dirname($this->settings['res_file']);
        }else{
            $mod_dir =  $GLOBALS['g']['phalcon_settings']['application']['modulesDir'].$this->settings['module'];
        }

        if(!file_exists($mod_dir)){
            mkdir($mod_dir, 0777, true);
        }
        $this->progress_file = $mod_dir.'/progress';
        $this->error_file    = $mod_dir.'/error';
        if(file_exists($this->error_file)){
            unlink($this->error_file);
        }

    }

    /**
     * Возвращаем memory_limit в исходную.
     */
    function __destruct(){
        ini_set('memory_limit', $this->old_memory_limit);
    }

    /**
     * Обработка фатальных ошибок скрипта.
     */
    public function ShutdownHandler(){
        if (@is_array($e = @error_get_last())) {
            file_put_contents($this->error_file, json_encode(error_get_last(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }

    /**
     * Remote File Size Using cURL
     * @param string $url
     * @return int || void
     */
    private function remotefileSize($url) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_NOBODY, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 0);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_exec($ch);
        $filesize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
        curl_close($ch);
        return $filesize;
    }

    /**
     * Обработка прогресса скачивания файла.
     * @param $resource
     * @param $download_size
     * @param $downloaded
     * @param $upload_size
     * @param $uploaded
     */
    public function progress($resource, $download_size, $downloaded, $upload_size, $uploaded){
        if($download_size == 0){
            return;
        }
        $new_progress   = $downloaded / $this->file_size  * 100;
        $delta = $new_progress - $this->progress;
        if( $delta > 10){
            $this->progress = round($new_progress, 0);
            file_put_contents($this->progress_file, $this->progress);
        }
        if($this->file_size == $downloaded){
            file_put_contents($this->progress_file, 100);
        }

    }

    /**
     * Скачивание файла с удаленного ресурса.
     */
    public function get_file(){
        if(!$this->settings){
            return false;
        }
        $this->file_size = $this->remotefileSize($this->settings['url']);

        file_put_contents($this->progress_file, 0);
        $fp = fopen($this->settings['res_file'], "w");
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_URL,  $this->settings['url']);
        curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, [$this, 'progress']);
        curl_setopt($ch, CURLOPT_NOPROGRESS, false); // needed to make progress function work
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        curl_exec($ch);
        $http_code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if($http_code != 200){
            file_put_contents($this->error_file, "Curl return code $http_code", FILE_APPEND);
        }
        curl_close($ch);


        return true;
    }

    /**
     * Выполнение действия с загруженным файлом.
     */
    public function action(){
        if(!$this->settings || !isset($this->settings['action'])){
            return;
        }
        if(md5_file($this->settings['res_file']) != $this->settings['md5']){
            unlink($this->settings['res_file']);
            file_put_contents($this->error_file, 'Error check summ...', FILE_APPEND);
            return;
        }

        if('module_install' == $this->settings['action']){
            $modulesDir = $GLOBALS['g']['phalcon_settings']['application']['modulesDir'];
            // unpack
            if(file_exists($this->settings['res_file'])){
                \Util::mwexec("7za e -spf -aoa -o{$modulesDir}/{$this->settings['module']} {$this->settings['res_file']}");
                \Util::mwexec("chown www:www -R {$modulesDir}/{$this->settings['module']}");
                \Util::mwexec('rm -rf '.dirname($this->settings['res_file']) );
            }else{
                return;
            }

            $path_class = "\\Modules\\{$this->settings['module']}\\setup\\PbxExtensionSetup";
            if(!class_exists("$path_class")){
                $path_class = false;
            }
            if($path_class){
                $setup      = new $path_class();
                $response   = $setup->installDB();
                \Util::restart_worker('worker_ami_listener');
                if($response){
                    $result['result'] = 'Success';
                }
            }
            file_put_contents("{$modulesDir}/{$this->settings['module']}/installed", '');
        }elseif ('upgrade_online' == $this->settings['action'] ){
            sleep(3);
            unlink($this->progress_file);
            \System::upgrade_from_img();
        }
    }
}

if(count($argv)>0 && file_exists($argv[1])){
    // php -f /etc/inc/workers/worker_download.php /storage/usbdisk1/mikopbx/tmp/ModuleCTIClient/download_settings.json
    $PID = \Util::get_pid_process("{$argv[1]}", ''.getmypid().' ');
    if(!empty($PID)){
        echo 'Error start download script... ';
        exit(4);
    }
    $d = new Downloader($argv[1]);
    $d->get_file();
    $d->action();
}

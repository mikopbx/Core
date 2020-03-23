<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace     Modules\Services;
use Models\PbxExtensionModules;
use Models\Users;
use PDOException;
use Util;
use System;

require_once 'globals.php';

class Monitor {
    private $last_check_time=0;

    public function __construct() {
        // register_shutdown_function([$this, 'ShutdownHandler']);
    }

    /**
     * Получение информации по модулям Askozia.
     * @return array
     */
    private function get_module_data():array {
        $result = $this->query('GET', 'https://update.askozia.ru/', ['TYPE'=>'MODULESLICINFO']);

        $data = [];
        if(isset($result['result']) && strtoupper($result['result']) === 'SUCCESS'){
            $data = $result['modules'] ?? [];
        }

        return $data;
    }

    /**
     * Отправка запроса HTTP.
     * @param      $method
     * @param      $url
     * @param null $data
     * @param null $headers
     * @return array
     */
    private function query($method, $url, $data = null, $headers = null):array
    {
        $curlOptions = [];

        if(is_array($headers)){
            $curlOptions[CURLOPT_HTTPHEADER] = $headers;
        }

        if ($method === 'POST') {
            $curlOptions[CURLOPT_POST]       = true;
            $curlOptions[CURLOPT_POSTFIELDS] = http_build_query($data);
        } elseif ( ! empty($data)) {
            $url .= strpos($url, '?') > 0 ? '&' : '?';
            $url .= http_build_query($data);
        }
        $curlOptions[CURLOPT_RETURNTRANSFER] = true;
        return $this->exec_curl($url, $curlOptions);
    }

    /**
     * Выполнение запроса с заданными параметрами.
     * @param $url
     * @param $curlOptions
     * @return array
     */
    private function exec_curl($url, $curlOptions):array {
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_TIMEOUT, 1);
        curl_setopt_array($curl, $curlOptions);
        $result = curl_exec($curl);

        $http_code      = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if($http_code !== 200){
            $data = [
                'ERROR' => $http_code,
                'data'  => $result
            ];
        }else{
            $data = json_decode($result, true);
        }

        return $data;
    }

    /**
     * Проверка целостности модулей.
     */
    public function check_modules():void {

        while (true) {
            file_put_contents(self::get_pid_file(), getmypid());
            sleep(5);
            $delta = time() - $this->last_check_time;
            if($delta < 86400){
                continue;
            }
            $this->last_check_time = time();
            $modules_miko = $this->get_module_data();

            $extensions_data = [];
            /** @var  PbxExtensionModules $data */
            try{
                $extensions_data = PbxExtensionModules::find('disabled=0');
            }catch (PDOException $e){
                if( (int)$e->errorInfo[1]===17 ){
                    // Обновляем схему базыданных.
                    init_db($GLOBALS['g']['m_di'], $GLOBALS['g']['phalcon_settings']);
                    $extensions_data = PbxExtensionModules::find('disabled=0');
                    // Если и тут будет исключение, то какая то другая, более грубая ошибка. Будем ловить...
                }
            }

            foreach ($extensions_data as $data){
                if( ($modules_miko[$data->uniqid]??true) === true) {
                    continue;
                }
                $lic_feature_id = $modules_miko[$data->uniqid]['lic_feature_id'] ?? '';
                if($lic_feature_id !== '' && !$this->capture_feature($lic_feature_id)){
                    $this->disable_module($data->uniqid);
                }
            }
        }
    }

    /**
     * Отключение модуля
     * @param $id
     */
    private function disable_module($id):void {
        /* Запрос на отключение модуля:
        curl 'http://127.0.0.1/admin-cabinet/pbx-extension-modules/disable/ModuleBitrix24Integration' \
              -H 'X-Requested-With: XMLHttpRequest' \
              -H 'Content-Type: application/x-www-form-urlencoded'
        //*/
        $url = 'http://127.0.0.1/admin-cabinet/pbx-extension-modules/disable/'.$id;
        $headers = [
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded'
        ];
        $response = $this->query('GET', $url, null, $headers);
        if($response['success']??false){
            Util::sys_log_msg($id, 'Disable module: license lost.');
        }
    }

    /**
     * Проверка.
     * @param $id
     * @return bool
     */
    private function capture_feature($id):bool {
        $result = false;

        $url = 'http://127.0.0.1:8223/license.api/featureavailable';
        $headers = [];
        $response = $this->query('GET', $url, ['feature' => $id], $headers);
        if( isset($response['result']) && !empty($response['result']) ){
            $result = true;
        }
        return $result;
    }

    /**
     * Обработка фатальных ошибок PHP.
     */
    public function ShutdownHandler():void {
        // if (@is_array($e = @error_get_last())) {
        //     Util::mwexec_bg('/usr/bin/php -f /etc/inc/cron/worker_safe_scripts.php');
        // }
    }

    /**
     * Получение PID рабочего процесса.
     * @return string
     */
    public static function get_pid_file():string {
        return '/var/run/module_monitor.pid';
    }


}

$worker_proc_name = 'module_monitor';
if(count($argv)>1 && $argv[1] === 'start') {
    cli_set_process_title($worker_proc_name);
    $b = new Monitor();
    $b->check_modules();
}else{
    cli_set_process_title($worker_proc_name.'_safe_script');
    $system = new System();
    $system->safe_modules($worker_proc_name, $argv[0]);
}


<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 11 2018
 */

require_once 'globals.php';

class WebAPIClient {
    private $host       = '127.0.0.1';
    private $protocol   = 'http';
    private $port       = '80';
    private $ckfile     = '/tmp/pbx_web_cookie.txt';
    private $errors     = [];

    /**
     * Авторизация на телефонной станции.
     */
    public function login(){
        $result = false;

        if(file_exists($this->ckfile)){
            unlink($this->ckfile);
        }
        $config = new Config();
        $res_login    = $config->get_general_settings("WebAdminLogin");
        $res_password = $config->get_general_settings("WebAdminPassword");
        $WEBPort      = $config->get_general_settings("WEBPort");

        if(!empty($WEBPort)){
            $this->port = $WEBPort;
        }

        $data = [
            'login' => $res_login,
            'password' => $res_password
        ];
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/session/start";
        $resultrequest = $this->post_data($url, $data, true);
        if($resultrequest['success'] == TRUE){
            $result = true;
        }else{
            $this->errors['login'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавляет нового сотрудника на АТС.
     * @param $data
     * @return bool
     */
    public function add_extension($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return $result;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/extensions/save";
        $resultrequest = $this->post_data($url, $data);
        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['extensions'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Возвращает список мест хранения.
     * @return bool|array
     */
    public function storage_list(){
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/pbxcore/api/storage/list";
        $resultrequest = $this->get_data($url);
        return $resultrequest;

    }

    /**
     * Добавляет нового сотрудника на АТС.
     * @param $data
     * @return bool
     */
    public function add_provider_sip($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return $result;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/providers/save/sip";
        $resultrequest = $this->post_data($url, $data);
        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['provider_sip'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавляет нового сотрудника на АТС.
     * @param $data
     * @return bool
     */
    public function add_provider_iax($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return $result;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/providers/save/iax";
        $resultrequest = $this->post_data($url, $data);
        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['provider_sip'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавляет нового manager asterisk.
     * @param $data
     * @return bool
     */
    public function add_manager($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/asterisk-managers/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавляет нового manager asterisk.
     * @param $data
     * @return bool
     */
    public function add_net_filter($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/firewall/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавление новой очереди.
     * @param $data
     * @return bool
     */
    public function add_queue($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/call-queues/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавление новой очереди.
     * @param $data
     * @return bool
     */
    public function add_ivr_menu($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/ivr-menu/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Сохранение настроек SMARTIVR.
     * @param $data
     * @return bool
     */
    public function add_smart_ivr($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/module-smart-i-v-r/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Добавление приложения.
     * @param $data
     * @return bool
     */
    public function add_dialplan_applications($data){
        $result = false;
        if(!file_exists($this->ckfile)){
            return false;
        }
        $url = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/dialplan-applications/save";
        $resultrequest = $this->post_data($url, $data);

        if($resultrequest['success'] == TRUE) {
            $result = true;
        }else{
            $this->errors['manager'][] = [
                'data' => $data,
                'message' => $resultrequest['message'],
            ];
        }
        return $result;
    }

    /**
     * Отправляет POST запрос по http. Возвращает ответ в виде массива.
     * @param  string $url
     * @param  array  $data
     * @param  bool  $is_login
     * @return string
     */
    private function post_data($url, $data, $is_login = false){
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST,           1);
        curl_setopt($ch, CURLOPT_POSTFIELDS,           http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT,        1);
        if($is_login == true){
            curl_setopt($ch, CURLOPT_COOKIEJAR,  $this->ckfile);
        }else{
            curl_setopt($ch, CURLOPT_COOKIEFILE, $this->ckfile);
        }

        $headers = [
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded',
        ];
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        // $http_code      = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $resultrequest  = curl_exec($ch);
        curl_close ($ch);
        return json_decode("$resultrequest", true);
    }

    /**
     * Отправляет GET запрос по http. Возвращает ответ в виде массива.
     * @param $url
     * @return mixed
     */
    private function get_data($url){
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT,        3);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $this->ckfile);
        $resultrequest  = curl_exec($ch);
        curl_close ($ch);
        return json_decode("$resultrequest", true);
    }
}
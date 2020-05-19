<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

class WebAPIClient
{
    private $host = '127.0.0.1';
    private $protocol = 'http';
    private $port = '80';
    private $ckfile = '/tmp/pbx_web_cookie.txt';
    private $errors = [];

    /**
     * Авторизация на телефонной станции.
     */
    public function login()
    {
        $result = false;

        if (file_exists($this->ckfile)) {
            unlink($this->ckfile);
        }
        $config       = new MikoPBXConfig();
        $res_login    = $config->getGeneralSettings("WebAdminLogin");
        $res_password = $config->getGeneralSettings("WebAdminPassword");
        $WEBPort      = $config->getGeneralSettings("WEBPort");

        if ( ! empty($WEBPort)) {
            $this->port = $WEBPort;
        }

        $data          = [
            'login'    => $res_login,
            'password' => $res_password,
        ];
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/session/start";
        $resultrequest = $this->postData($url, $data, true);
        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['login'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Отправляет POST запрос по http. Возвращает ответ в виде массива.
     *
     * @param string $url
     * @param array  $data
     * @param bool   $is_login
     *
     * @return string
     */
    private function postData($url, $data, $is_login = false)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        if ($is_login == true) {
            curl_setopt($ch, CURLOPT_COOKIEJAR, $this->ckfile);
        } else {
            curl_setopt($ch, CURLOPT_COOKIEFILE, $this->ckfile);
        }

        $headers = [
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded',
        ];
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        // $http_code      = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $resultrequest = curl_exec($ch);
        curl_close($ch);

        return json_decode("$resultrequest", true);
    }

    /**
     * Добавляет нового сотрудника на АТС.
     *
     * @param $data
     *
     * @return bool
     */
    public function addExtension($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return $result;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/extensions/save";
        $resultrequest = $this->postData($url, $data);
        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['extensions'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Возвращает список мест хранения.
     *
     * @return bool|array
     */
    public function storage_list()
    {
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/pbxcore/api/storage/list";

        return $this->getData($url);
    }

    /**
     * Отправляет GET запрос по http. Возвращает ответ в виде массива.
     *
     * @param $url
     *
     * @return mixed
     */
    private function getData($url)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $this->ckfile);
        $resultrequest = curl_exec($ch);
        curl_close($ch);

        return json_decode("$resultrequest", true);
    }

    /**
     * Добавляет нового сотрудника на АТС.
     *
     * @param $data
     *
     * @return bool
     */
    public function addProviderSip($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return $result;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/providers/save/sip";
        $resultrequest = $this->postData($url, $data);
        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['provider_sip'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавляет нового сотрудника на АТС.
     *
     * @param $data
     *
     * @return bool
     */
    public function addProviderIax($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return $result;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/providers/save/iax";
        $resultrequest = $this->postData($url, $data);
        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['provider_sip'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавляет нового manager asterisk.
     *
     * @param $data
     *
     * @return bool
     */
    public function addManager($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/asterisk-managers/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавляет нового manager asterisk.
     *
     * @param $data
     *
     * @return bool
     */
    public function addNetFilter($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/firewall/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавление новой очереди.
     *
     * @param $data
     *
     * @return bool
     */
    public function addQueue($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/call-queues/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавление новой очереди.
     *
     * @param $data
     *
     * @return bool
     */
    public function addIvrMenu($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/ivr-menu/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Сохранение настроек SMARTIVR.
     *
     * @param $data
     *
     * @return bool
     */
    public function addSmartIvr($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/module-smart-i-v-r/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }

    /**
     * Добавление приложения.
     *
     * @param $data
     *
     * @return bool
     */
    public function add_dialplan_applications($data)
    {
        $result = false;
        if ( ! file_exists($this->ckfile)) {
            return false;
        }
        $url           = "{$this->protocol}://{$this->host}:{$this->port}/admin-cabinet/dialplan-applications/save";
        $resultrequest = $this->postData($url, $data);

        if ($resultrequest['success'] == true) {
            $result = true;
        } else {
            $this->errors['manager'][] = [
                'data'    => $data,
                'message' => $resultrequest['message'],
            ];
        }

        return $result;
    }
}
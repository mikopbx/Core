<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class NetworkManagementProcessor extends Injectable
{
    /**
     * Получение информации о публичном IP.
     *
     * @return PBXApiResult
     */
    public static function getExternalIpInfo(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $curl   = curl_init();
        if($curl === false){
            $res->messages[] = 'CURL initialization error';
            return $res;
        }
        $url    = 'https://ipinfo.io/json';
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 2);

        try {
            $resultrequest = curl_exec($curl);
        } catch (\Exception $e) {
            $res->messages[] = $e->getMessage();
            return $res;
        }
        curl_close($curl);
        if (Util::isJson($resultrequest)) {
            $res->success = true;
            $response = json_decode($resultrequest, true);
            $res->data['ip']   = $response['ip'];
        } else {
            $res->messages[] = 'Error format data ' . $resultrequest;
        }

        return $res;
    }
}
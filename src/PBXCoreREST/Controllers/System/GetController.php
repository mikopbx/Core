<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /pbxcore/api/system/{name} Управление системой в целом (GET)
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/shutdown;
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/reboot;
 * Получения забаненных ip
 *   curl http://172.16.156.212/pbxcore/api/system/getBanIp;
 * Получение информации о системе
 *   curl http://172.16.156.223/pbxcore/api/system/getInfo;
 * Настройка msmtp
 *   curl http://172.16.156.212/pbxcore/api/system/reloadMsmtp;
 * Старт сбора логов.
 *   curl http://172.16.156.212/pbxcore/api/system/startLog;
 * Завершение сбора логов.
 *
 * Пинг АТС (описан в nginx.conf):
 *   curl http://172.16.156.223/pbxcore/api/system/ping
 * Получение информации о внешнем IP адресе:
 *   curl http://172.16.156.212/pbxcore/api/system/getExternalIpInfo
 *
 */
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $requestMessage = json_encode(
            [
                'processor' => 'system',
                'data'      => null,
                'action'    => $actionName,
            ]
        );
        $connection     = $this->beanstalkConnection;

        if ($actionName === 'stopLog') {
            $response = $connection->request($requestMessage, 60, 0);
        } elseif ( $actionName === 'getLogFromFile' ){
            $message = json_decode($requestMessage, true);
            $message['data'] = $_GET;
            $requestMessage = json_encode($message);
            $response = $connection->request($requestMessage, 60, 0);
        } else {
            $response = $connection->request($requestMessage, 5, 0);
        }
        if ($response !== false) {
            $response = json_decode($response, true);
            if ($actionName === 'stopLog') {
                $di = Di::getDefault();
                $downloadLink = $di->getShared('config')->path('core.downloadCachePath');
                $filename     = $downloadLink."/".$response['data']['filename']??'';
                if (!file_exists($filename)) {
                    $this->response->setPayloadSuccess('Log file not found.');
                    return;
                }
                $scheme = $this->request->getScheme();
                $host   = $this->request->getHttpHost();
                $port   = $this->request->getPort();

                $this->response->redirect("{$scheme}://{$host}:{$port}/pbxcore/files/cache/{$response['data']['filename']}");
                $this->response->sendRaw();

             }elseif ($actionName === 'getLogFromFile') {
                $this->response->setPayloadSuccess('Log file not found.');
                $filename = $response['data'][0]??'';
                if (!file_exists($filename)) {
                    $this->response->setPayloadSuccess('Log file not found.');
                    return;
                }
                $response['data'][] = $filename;
                $response['data'][0] = ''.file_get_contents($filename);
                unlink($filename);
                $this->response->setPayloadSuccess($response);
            } else {
                $this->response->setPayloadSuccess($response);
            }
        } else {
            $this->sendError(500);
        }
    }
}
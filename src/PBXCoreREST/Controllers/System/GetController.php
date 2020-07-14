<?php

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
 *   curl http://172.16.156.212/pbxcore/api/system/stopLog;
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
        } else {
            $response = $connection->request($requestMessage, 5, 0);
        }
        if ($response !== false) {
            $response = json_decode($response, true);
            if ($actionName === 'stopLog') {
                if ( ! file_exists($response['filename'])) {
                    $this->response->setPayloadSuccess('Log file not found.');

                    return;
                }
                $scheme       = $this->request->getScheme();
                $host         = $this->request->getHttpHost();
                $port         = $this->request->getPort();
                $uid          = Util::generateRandomString(36);
                $di           = Di::getDefault();
                $downloadLink = $di->getShared('config')->path('core.downloadCachePath');

                $result_dir = "{$downloadLink}/{$uid}";
                Util::mwMkdir($result_dir);
                $link_name = md5($response['filename']) . '.' . Util::getExtensionOfFile($response['filename']);
                $lnPath = Util::which('ln');
                Util::mwExec("{$lnPath} -s {$response['filename']} {$result_dir}/{$link_name}");
                $this->response->redirect("{$scheme}://{$host}:{$port}/pbxcore/files/cache/{$uid}/{$link_name}");
                $this->response->sendRaw();
            } else {
                $this->response->setPayloadSuccess($response);
            }
        } else {
            $this->sendError(500);
        }
    }
}
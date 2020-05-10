<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

class ModulesControllerBase extends BaseController
{

    /**
     * API дополнительных модулей.
     * Проверка работы модуля:
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/check
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/check
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleTelegramNotify/check
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Notify/check
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/check
     *
     * Перезапуск модуля с генерацией конфига:
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/reload
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/reload
     *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/reload
     *
     * Деинсталляция модуля:
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleSmartIVR/uninstall
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleCTIClient/uninstall
     * Статус загрузки модуля на АТС:
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleSmartIVR/status/
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleCTIClient/status/
     *
     * Выполнение действий без основной авторизации.
     * curl
     * http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/customAction?action=getcfg&mac=00135E874B49&solt=test
     * curl
     * http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/customAction?action=getimg&file=logo-yealink-132x32.dob
     *
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=b24-uve4uz.bitrix24.ru
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=miko24.ru
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction
     *
     * curl http://127.0.0.1/pbxcore/api/modules/ModuleWebConsole/show_console
     * curl http://127.0.0.1/pbxcore/api/modules/ModuleWebConsole/show_console
     *
     * @param $moduleName
     * @param $actionName
     */
    public function callActionForModule($moduleName, $actionName): void
    {
        $_REQUEST['ip_srv'] = $_SERVER['SERVER_ADDR'];
        $input              = file_get_contents('php://input');
        $request            = [
            'data'           => $_REQUEST,
            'module'         => $moduleName,
            'input'          => $input,     // Параметры запроса.
            'action'         => $actionName,
            'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
            'processor'      => 'modules',
        ];

        $connection = $this->beanstalkConnection;
        $response   = $connection->request($request, 100, 0);
        if ($response !== false) {
            $response = json_decode($response, true);
            if (isset($response['fpassthru'])) {
                $fp = fopen($response['filename'], "rb");
                if ($fp) {
                    $size = filesize($response['filename']);
                    $name = basename($response['filename']);
                    $this->response->setHeader('Content-Description', "config file");
                    $this->response->setHeader('Content-Disposition', "attachment; filename={$name}");
                    $this->response->setHeader('Content-type', "text/plain");
                    $this->response->setHeader('Content-Transfer-Encoding', "binary");
                    $this->response->setContentLength($size);
                    $this->response->sendHeaders();
                    fpassthru($fp);
                }
                fclose($fp);
                if (isset($response['need_delete']) && $response['need_delete'] == true) {
                    unlink($response['filename']);
                }
            } elseif (isset($response['redirect'])) {
                $this->response->redirect($response['redirect'], true, 302);
                $this->response->sendRaw();
            } elseif (isset($response['headers']) && isset($response['echo'])) {
                foreach ($response['headers'] as $name => $value) {
                    $this->response->setHeader($name, $value);
                }
                $this->response->setPayloadSuccess($response['echo']);
            } elseif (isset($response['echo_file'])) {
                $this->response->setStatusCode(200, 'OK')->sendHeaders();
                $this->response->setFileToSend($response['echo_file']);
                $this->response->sendRaw();
            } else {
                $this->response->setPayloadSuccess($response);
            }
        } else {
            $this->sendError(500);
        }
    }
}
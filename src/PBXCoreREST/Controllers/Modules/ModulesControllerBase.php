<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
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
     *
     * Выполнение действий без основной авторизации.
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/getcfg?mac=00135E874B49&solt=test
     * curl http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/getimg?file=logo-yealink-132x32.dob
     *
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=b24-uve4uz.bitrix24.ru
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=miko24.ru
     * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction
     *
     * @param $moduleName
     * @param $actionName
     */
    public function callActionForModule($moduleName, $actionName): void
    {
        $_REQUEST['ip_srv'] = $_SERVER['SERVER_ADDR'];
        $input              = file_get_contents('php://input');
        $request            = json_encode([
            'data'           => $_REQUEST,
            'module'         => $moduleName,
            'input'          => $input,     // Параметры запроса.
            'action'         => $actionName,
            'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
            'processor'      => 'modules',
        ]);

        $response   = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME)->request($request, 30, 0);
        if ($response !== false) {
            $response = json_decode($response, true);
            if (isset($response['data']['fpassthru'])) {
                $filename = $response['data']['filename']??'';
                $fp = fopen($filename, "rb");
                if ($fp!==false) {
                    $size = filesize($filename);
                    $name = basename($filename);
                    $this->response->setHeader('Content-Description', "config file");
                    $this->response->setHeader('Content-Disposition', "attachment; filename={$name}");
                    $this->response->setHeader('Content-type', "text/plain");
                    $this->response->setHeader('Content-Transfer-Encoding', "binary");
                    $this->response->setContentLength($size);
                    $this->response->sendHeaders();
                    fpassthru($fp);
                    fclose($fp);
                }
                if (isset($response['data']['need_delete']) && $response['data']['need_delete'] === true) {
                    unlink($filename);
                }
            } elseif (isset($response['html'])) {
                echo $response['html'];
                $this->response->sendRaw();
            } elseif (isset($response['redirect'])) {
                $this->response->redirect($response['redirect'], true);
                $this->response->sendRaw();
            } elseif ( isset($response['echo'], $response['headers']) ) {
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
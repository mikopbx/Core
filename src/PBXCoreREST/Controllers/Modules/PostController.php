<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\Core\System\Util;
use Phalcon\Di;


class PostController extends ModulesControllerBase
{
    /**
     * Загрузка модуля по http /api/modules/{command}
     * curl -X POST -d '{"uniqid":"ModuleCTIClient", "md5":"fd9fbf38298dea83667a36d1d0464eae", "url":
     * "https://www.askozia.ru/upload/update/modules/ModuleCTIClient/ModuleCTIClientv01.zip"}'
     * http://172.16.156.223/pbxcore/api/modules/upload; curl -X POST -d '{"uniqid":"ModuleSmartIVR",
     * "md5":"fc64fd786f4242885ab50ce5f1fb56c5", "url":
     * "https://www.askozia.ru/upload/update/modules/ModuleSmartIVR/ModuleSmartIVRv01.zip"}'
     * http://172.16.156.223/pbxcore/api/modules/upload; Загрузка аудио файла на АТС: curl -F
     * "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/modules/upload; curl -X POST -d
     * '{"filename":"/storage/usbdisk1/mikopbx/tmp/ModuleTemplate.zip"}' http://127.0.0.1/pbxcore/api/modules/unpack -H
     * 'Cookie: XDEBUG_SESSION=PHPSTORM';
     *
     * @param $actionName
     */
    public function callAction($actionName): void
    {
        $result = [
            'result' => 'ERROR',
            'uniqid' => null,
        ];
        $data   = null;
        if ('upload' === $actionName && $this->request->hasFiles() === 0) {
            if (Util::isJson($this->request->getRawBody())) {
                $row_data = $this->request->getRawBody();
                $data     = json_decode($row_data, true);
            } else {
                $result['data'] = 'Body is not JSON';
            }
        } elseif (in_array($actionName, ['upload', 'unpack'])) {
            $tempDir     = $this->config->path('core.tempPath');
            $module_file = "{$tempDir}/" . time() . '.zip';
            if ($this->request->hasFiles() > 0) {
                foreach ($this->request->getUploadedFiles() as $file) {
                    $extension = Util::getExtensionOfFile($file->getName());
                    if ($extension !== 'zip') {
                        continue;
                    }
                    $file->moveTo($module_file);
                    break;
                }
            } elseif ('unpack' === $actionName) {
                $postData = json_decode($this->request->getRawBody(), true);
                if ($postData && isset($postData['filename']) && file_exists($postData['filename'])) {
                    copy($postData['filename'], $module_file);
                }
            }
            if (file_exists($module_file)) {
                $cmd = 'f="' . $module_file . '"; p=`7za l $f | grep module.json`;if [ "$?" == "0" ]; then 7za -so e -y -r $f `echo $p |  awk -F" " \'{print $6}\'`; fi';
                Util::mwExec($cmd, $out);
                $settings = json_decode(implode("\n", $out), true);

                $module_uniqid = $settings['module_uniqid'] ?? null;
                if ( ! $module_uniqid) {
                    $result['data'] = 'The" module_uniqid " in the module file is not described.the json or file does not exist.';
                }
                $data = [
                    'md5'    => md5_file($module_file),
                    'url'    => "file://{$module_file}",
                    'l_file' => $module_file,
                    'uniqid' => $module_uniqid,
                ];
            } else {
                $result['data'] = 'Failed to upload file to server';
            }
            $command = 'upload';
        } elseif (in_array($actionName, ['enable', 'disable'])) {
            $data = $actionName;
        }

        if ($data) {
            $requestMessage = json_encode(
                [
                    'processor' => 'modules',
                    'data'      => $data,           // Параметры запроса.
                    'module'    => $data['uniqid'], // Параметры запроса.
                    'action'    => $command         // Операция.
                ]
            );
            $connection     = $this->beanstalkConnection;
            $response       = $connection->request($requestMessage, 15, 0);
            if ($response !== false) {
                $response = json_decode($response, true);
                $this->response->setPayloadSuccess($response);
            } else {
                $this->sendError(500);
            }
        } else {
            $this->sendError(400, $result['data']);
        }
    }

}
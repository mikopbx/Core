<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /pbxcore/api/system/{name}' Управление системой в целом (POST).
 * Установка системного времени
 *   curl -X POST -d '{"date": "2015.12.31-01:01:20"}' http://172.16.156.212/pbxcore/api/system/setDate;
 *
 * Отправка email.
 *   curl -X POST -d '{"email": "apor@miko.ru", "subject":"Привет от mikopbx", "body":"Тестовое сообщение", "encode":
 *   ""}' http://172.16.156.223/pbxcore/api/system/sendMail;
 *     'encode' - может быть пустой строкой или 'base64', на случай, если subject и body передаются в base64;
 *
 * Снятие бана IP адреса
 *   curl -X POST -d '{"ip": "172.16.156.1"}' http://172.16.156.212/pbxcore/api/system/unBanIp;
 *   Пример ответа:
 *   {"result":"Success","data":[{"jail":"asterisk","ip":"172.16.156.1","timeofban":1522326119}],"function":"getBanIp"}
 *
 * Получение содержимого файла.
 *   curl -X POST -d '{"filename": "/etc/asterisk/asterisk.conf"}'
 *   http://172.16.156.212/pbxcore/api/system/fileReadContent; Примеры ответа:
 *   {"result":"ERROR","message":"API action not found;","function":"fileReadContent"}
 *   {"result":"Success","data":"W2RpcmVj","function":"fileReadContent"}
 *
 * Конвертация аудио файла:
 *   curl -X POST -d '{"filename": "/tmp/WelcomeMaleMusic.mp3"}'
 *   http://172.16.156.212/pbxcore/api/system/convertAudioFile; Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "convertAudioFile"
 *   }
 * Загрузка аудио файла на АТС:
 *   curl  -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/1577195443/test.mp3"}'
 *   http://127.0.0.1/pbxcore/api/system/uploadAudioFile -H 'Cookie: XDEBUG_SESSION=PHPSTORM'; curl  -F
 *   "file=@/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2019/11/29/10/mikopbx-15750140_201_YNrXH1KHDj.mp3"
 *   http://127.0.0.1/pbxcore/api/system/uploadAudioFile; Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "uploadAudioFile"
 *   }
 * Удаление аудио файла:
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}'
 *   http://172.16.156.212/pbxcore/api/system/removeAudioFile; Обновление системы (офлайн) curl -X POST -d
 *   '{"filename": "/storage/usbdisk1/mikopbx/tmp/2019.4.200-mikopbx-generic-x86-64-linux.img"}'
 *   http://127.0.0.1/pbxcore/api/system/upgrade -H 'Cookie: XDEBUG_SESSION=PHPSTORM'; curl -F
 *   "file=@1.0.5-9.0-svn-mikopbx-x86-64-cross-linux.img" http://172.16.156.212/pbxcore/api/system/upgrade; Онлайн
 *   обновление АТС. curl -X POST -d '{"md5":"df7622068d0d58700a2a624d991b6c1f", "url":
 *   "https://www.askozia.ru/upload/update/firmware/6.2.96-9.0-svn-mikopbx-x86-64-cross-linux.img"}'
 *   http://172.16.156.223/pbxcore/api/system/upgradeOnline;
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $di       = Di::getDefault();
        $tempDir  = $di->getShared('config')->path('core.tempPath');
        $mediaDir = $di->getShared('config')->path('asterisk.mediadir');
        $mohDir   = $di->getShared('config')->path('asterisk.mohdir');
        if ($actionName === 'upgrade') {
            $upd_file = "{$tempDir}/update.img";
            $res      = false;
            if ($this->request->hasFiles() === 0) {
                // Используем существующий файл;
                $postData = json_decode($this->request->getRawBody(), true);
                if ($postData && isset($postData['filename']) && file_exists($postData['filename'])) {
                    $res = Util::mwExec("cp '{$postData['filename']}' '{$upd_file}'") === 0;
                }
            } else {
                // Загружаем новый файл на сервер
                foreach ($this->request->getUploadedFiles() as $file) {
                    $res = $file->moveTo($upd_file);
                }
            }
            // Проверяем существование файла.
            $res = ($res && file_exists($upd_file));
            if ($res !== true) {
                $this->sendError(404, 'Update file not found.');

                return;
            }
            $data = null;
        } elseif ($actionName === 'uploadAudioFile') {
            $category = $this->request->getPost('category');
            foreach ($this->request->getUploadedFiles() as $file) {
                switch ($category) {
                    case SoundFiles::CATEGORY_MOH:
                        $filename = "{$mohDir}/" . basename($file->getName());
                        break;
                    case SoundFiles::CATEGORY_CUSTOM:
                        $filename = "{$mediaDir}/" . basename($file->getName());
                        break;
                    default:
                        $this->sendError(400, 'Category not set');

                        return;
                }
                $data['uploadedBlob'] = $file->getTempName();
                $data['filename']     = $filename;
            }
            $actionName = 'convertAudioFile';
        } else {
            $row_data = $this->request->getRawBody();
            // Проверим, переданные данные.
            if ( ! Util::isJson($row_data)) {
                $this->sendError(400, 'It is not JSON');

                return;
            }
            $data = json_decode($row_data, true);
        }

        $this->sendRequestToBackendWorker('system', $actionName, $data);
    }
}
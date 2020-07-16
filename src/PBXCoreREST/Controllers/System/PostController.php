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
 *
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
 *
 * Загрузка аудио файла на АТС:
 *   curl  -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/1577195443/test.mp3"}'
 *   http://127.0.0.1/pbxcore/api/system/uploadAudioFile -H 'Cookie: XDEBUG_SESSION=PHPSTORM'; curl  -F
 *   "file=@/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2019/11/29/10/mikopbx-15750140_201_YNrXH1KHDj.mp3"
 *   http://127.0.0.1/pbxcore/api/system/uploadAudioFile;
 *
 * Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "uploadAudioFile"
 *   }
 *
 * Удаление аудио файла:
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}'
 *   http://172.16.156.212/pbxcore/api/system/removeAudioFile;
 *
 *
 * Обновление системы (офлайн) curl -X POST -d
 *   '{"filename": "/storage/usbdisk1/mikopbx/tmp/2019.4.200-mikopbx-generic-x86-64-linux.img"}'
 *   http://127.0.0.1/pbxcore/api/system/upgrade -H 'Cookie: XDEBUG_SESSION=PHPSTORM'; curl -F
 *   "file=@1.0.5-9.0-svn-mikopbx-x86-64-cross-linux.img" http://172.16.156.212/pbxcore/api/system/upgrade;
 *
 *
 * Онлайн обновление АТС. curl -X POST -d '{"md5":"df7622068d0d58700a2a624d991b6c1f", "url":
 *   "https://www.askozia.ru/upload/update/firmware/6.2.96-9.0-svn-mikopbx-x86-64-cross-linux.img"}'
 *   http://172.16.156.223/pbxcore/api/system/upgradeOnline;
 *
 *
 * Install new module with params by URL
 * curl -X POST -d '{"uniqid":"ModuleCTIClient", "md5":"fd9fbf38298dea83667a36d1d0464eae", "url":
 * "https://www.askozia.ru/upload/update/modules/ModuleCTIClient/ModuleCTIClientv01.zip"}'
 * http://172.16.156.223/pbxcore/api/modules/uploadNewModule;
 *
 *
 * Receive uploading status
 * curl  -X POST -d '{"uniqid":"ModuleSmartIVR"} http://172.16.156.223/pbxcore/api/system/statusUploadingNewModule
 *
 *
 * Install new module from ZIP archive:
 * curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/modules/uploadNewModule;
 *
 *
 * Uninstall module:
 * curl -X POST -d '{"uniqid":"ModuleSmartIVR"} http://172.16.156.223/pbxcore/api/system/uninstallModule
 *
 *
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $data = null;
        switch ($actionName) {
            case 'convertAudioFile':
                $data = $this->convertAudioFile();
                if ($data === null) {
                    return;
                }
                break;
            case 'uploadNewModule':
                $data = $this->uploadNewModule();
                if ($data === null) {
                    return;
                }
                break;
            default:
                $data = $this->request->getPost();
        }

        $this->sendRequestToBackendWorker('system', $actionName, $data);
    }

    /**
     * Categorize and store uploaded audio files
     *
     * @return array|null
     */
    private function convertAudioFile():?array
    {
        $data = [];
        $category = $this->request->getPost('category');
        $data['temp_filename'] = $this->request->getPost('temp_filename');
        $di       = Di::getDefault();
        $mediaDir = $di->getShared('config')->path('asterisk.mediadir');
        $mohDir   = $di->getShared('config')->path('asterisk.mohdir');
        switch ($category) {
            case SoundFiles::CATEGORY_MOH:
                $data['filename'] = "{$mohDir}/" . basename($data['temp_filename']);
                break;
            case SoundFiles::CATEGORY_CUSTOM:
                $data['filename'] = "{$mediaDir}/" . basename($data['temp_filename']);
                break;
            default:
                $this->sendError(400, 'Category not set');

                return null;
        }
        return $data;
    }

    /**
     * Upload extension module, or download it from internet if only url was sent
     * @return array|null
     */
    private function uploadNewModule():?array
    {
        if ($this->request->hasFiles() === 0) {
            $data = $this->request->getPost();
        } else {
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
            }
            if (file_exists($module_file)) {
                $cmd = 'f="' . $module_file . '"; p=`7za l $f | grep module.json`;if [ "$?" == "0" ]; then 7za -so e -y -r $f `echo $p |  awk -F" " \'{print $6}\'`; fi';
                Util::mwExec($cmd, $out);
                $settings = json_decode(implode("\n", $out), true);

                $module_uniqid = $settings['module_uniqid'] ?? null;
                if ( ! $module_uniqid) {
                    $this->sendError(
                        400,
                        'The" module_uniqid " in the module file is not described.the json or file does not exist.'
                    );
                }
                $data = [
                    'md5'    => md5_file($module_file),
                    'url'    => "file://{$module_file}",
                    'l_file' => $module_file,
                    'uniqid' => $module_uniqid,
                ];
            } else {
                $this->sendError(500, 'Failed to upload file to server');

                return null;
            }
        }

        return $data;
    }
}
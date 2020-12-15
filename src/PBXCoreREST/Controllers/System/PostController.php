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

namespace MikoPBX\PBXCoreREST\Controllers\System;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /pbxcore/api/system/{name}' System management (POST).
 *
 * Setup system time
 *   curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate
 *
 * Send email
 *   curl -X POST -d '{"email": "apor@miko.ru", "subject":"Hi from mikopbx", "body":"Test message", "encode":""}' http://172.16.156.223/pbxcore/api/system/sendMail;
 *     'encode' - может быть пустой строкой или 'base64', на случай, если subject и body передаются в base64;
 *
 * Unban IP address
 *   curl -X POST -d '{"ip": "172.16.156.1"}' http://172.16.156.212/pbxcore/api/system/unBanIp;
 *   Answer example:
 *   {"result":"Success","data":[{"jail":"asterisk","ip":"172.16.156.1","timeofban":1522326119}],"function":"getBanIp"}
 *
 * Get config file content
 *   curl -X POST -d '{"filename": "/etc/asterisk/asterisk.conf"}'
 *   http://172.16.156.212/pbxcore/api/system/fileReadContent;
 *
 * Answer example:
 *   {"result":"ERROR","message":"API action not found;","function":"fileReadContent"}
 *   {"result":"Success","data":"W2RpcmVj","function":"fileReadContent"}
 *
 * Convert audiofile:
 *   curl -X POST -d '{"filename": "/tmp/WelcomeMaleMusic.mp3"}'
 *   http://172.16.156.212/pbxcore/api/system/convertAudioFile; Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "convertAudioFile"
 *   }
 *
 *
 * Delete audiofile:
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}'
 *   http://172.16.156.212/pbxcore/api/system/removeAudioFile;
 *
 *
 * System upgrade (from file)
 * curl -X POST -d
 *   '{"filename": "/storage/usbdisk1/mikopbx/tmp/2019.4.200-mikopbx-generic-x86-64-linux.img"}'
 *   http://127.0.0.1/pbxcore/api/system/upgrade -H 'Cookie: XDEBUG_SESSION=PHPSTORM'; curl -F
 *   "file=@1.0.5-9.0-svn-mikopbx-x86-64-cross-linux.img" http://172.16.156.212/pbxcore/api/system/upgrade;
 *
 *
 * System upgrade (over link)
 * curl -X POST -d '{"md5":"df7622068d0d58700a2a624d991b6c1f", "url":
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
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        switch ($actionName) {
            case 'convertAudioFile':
                $this->convertAudioFile();
                break;
            default:
                $data = $this->request->getPost();
                $this->sendRequestToBackendWorker('system', $actionName, $data);
        }
    }

    /**
     * Categorize and store uploaded audio files
     */
    private function convertAudioFile(): void
    {
        $data                  = [];
        $category              = $this->request->getPost('category');
        $data['temp_filename'] = $this->request->getPost('temp_filename');
        $di                    = Di::getDefault();
        $mediaDir              = $di->getShared('config')->path('asterisk.customSoundDir');
        $mohDir                = $di->getShared('config')->path('asterisk.mohdir');
        switch ($category) {
            case SoundFiles::CATEGORY_MOH:
                $data['filename'] = "{$mohDir}/" . basename($data['temp_filename']);
                break;
            case SoundFiles::CATEGORY_CUSTOM:
                $data['filename'] = "{$mediaDir}/" . basename($data['temp_filename']);
                break;
            default:
                $this->sendError(400, 'Category not set');
        }
        $requestMessage = json_encode(
            [
                'processor' => 'system',
                'data'      => $data,
                'action'    => 'convertAudioFile',
            ]
        );
        $connection     = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        $response       = $connection->request($requestMessage, 15, 0);
        if ($response !== false) {
            $response = json_decode($response, true);
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(500);
        }
    }

}
<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;

/**
 * System management (POST).
 *
 * @RoutePrefix("/pbxcore/api/system")
 *
 *
 * @examples
 * Setup system time
 *   curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate
 *
 * Sends an email notification.
 *   curl -X POST -d '{"email": "apor@miko.ru", "subject":"Hi from mikopbx", "body":"Test message", "encode":""}' http://127.0.0.1/pbxcore/api/system/sendMail;
 *     'encode' -  can be an empty string or 'base64' in case subject and body are passed in base64;
 *
 * Convert audiofile:
 *   curl -X POST -d '{"filename": "/tmp/WelcomeMaleMusic.mp3"}'
 *   http://127.0.0.1/pbxcore/api/system/convertAudioFile;
 *
 * Response example:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "convertAudioFile"
 *   }
 *
 * Upgrade the PBX using uploaded IMG file.
 * curl -X POST -d
 *   '{"filename": "/storage/usbdisk1/mikopbx/tmp/mikopbx-2023.1.223-x86_64.img"}'
 *   http://127.0.0.1/pbxcore/api/system/upgrade -H 'Cookie: XDEBUG_SESSION=PHPSTORM';
 *
 * curl -F "file=@mikopbx-2023.1.223-x86_64.img" http://172.16.156.212/pbxcore/api/system/upgrade;
 *
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Updates the system date and time
     * @Post("/setDate")
     *
     * Sends an email notification.
     * @Post("/sendMail")
     *
     * Convert the audio file to various codecs using Asterisk.
     * @Post("/convertAudioFile")
     *
     * Upgrade the PBX using uploaded IMG file.
     * @Post("/upgrade")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        switch ($actionName) {
            default:
                $data = $this->request->getPost();
                $this->sendRequestToBackendWorker(SystemManagementProcessor::class, $actionName, $data);
        }
    }
}

<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\System\ConvertAudioFileAction;
use MikoPBX\PBXCoreREST\Lib\System\GetDateAction;
use MikoPBX\PBXCoreREST\Lib\System\RebootAction;
use MikoPBX\PBXCoreREST\Lib\System\RestoreDefaultSettingsAction;
use MikoPBX\PBXCoreREST\Lib\System\SendMailAction;
use MikoPBX\PBXCoreREST\Lib\System\SetDateAction;
use MikoPBX\PBXCoreREST\Lib\System\ShutdownAction;
use MikoPBX\PBXCoreREST\Lib\System\UpdateMailSettingsAction;
use MikoPBX\PBXCoreREST\Lib\System\UpgradeFromImageAction;
use Phalcon\Di\Injectable;

/**
 * Class SystemManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     * @throws \Exception
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'reboot':
                $res = RebootAction::main();
                break;
            case 'shutdown':
                $res= ShutdownAction::main();
                break;
            case 'getDate':
                $res= GetDateAction::main();
                break;
            case 'setDate':
                $res= SetDateAction::main($data);
                break;
            case 'updateMailSettings':
             $res = UpdateMailSettingsAction::main();
                break;
            case 'sendMail':
                $res = SendMailAction::main($data);
                break;
            case 'upgrade':
                $imageFileLocation = $data['temp_filename']??'';
                $res = UpgradeFromImageAction::main($imageFileLocation);
                break;
            case 'restoreDefault':
                $ch = 0;
                do{
                    $ch++;
                    $res = RestoreDefaultSettingsAction::main();
                    sleep(1);
                }while($ch <= 10 && !$res->success);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Processes::mwExec("{$mvPath} {$request['data']['temp_filename']} {$request['data']['filename']}");
                $res = ConvertAudioFileAction::main($request['data']['filename']);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        }

        $res->function = $action;

        return $res;
    }
}
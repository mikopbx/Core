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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\SysLogs\DownloadLogFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\DownloadLogsArchiveAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\EraseFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\GetLogFromFileAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\GetLogsListAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\PrepareLogAction;
use MikoPBX\PBXCoreREST\Lib\SysLogs\StartLogAction;
use Phalcon\Di\Injectable;

/**
 * Class SysLogsManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SysLogsManagementProcessor extends Injectable
{
    /**
     * Processes syslog requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getLogFromFile':
                $res = GetLogFromFileAction::main($data);
                break;
            case 'prepareLog':
                $res = PrepareLogAction::main(false);
                $res->processor = $action;
                break;
            case 'startLog':
                $res = StartLogAction::main();
                break;
            case 'stopLog':
                $res = PrepareLogAction::main(true);
                $res->processor = $action;
                break;
            case 'downloadLogsArchive':
                $res = DownloadLogsArchiveAction::main($data['filename']);
                break;
            case 'downloadLogFile':
                $res = DownloadLogFileAction::main($data['filename']);
                break;
            case 'getLogsList':
                $res = GetLogsListAction::main();
                break;
            case 'eraseFile':
                $res = EraseFileAction::main($data['filename']);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        }

        $res->function = $action;

        return $res;
    }

}
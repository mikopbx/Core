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

use MikoPBX\PBXCoreREST\Lib\License\CaptureFeatureForProductIdAction;
use MikoPBX\PBXCoreREST\Lib\License\GetLicenseInfoAction;
use MikoPBX\PBXCoreREST\Lib\License\GetMikoPBXFeatureStatusAction;
use MikoPBX\PBXCoreREST\Lib\License\PingAction;
use MikoPBX\PBXCoreREST\Lib\License\ProcessUserRequestAction;
use MikoPBX\PBXCoreREST\Lib\License\ResetLicenseAction;
use MikoPBX\PBXCoreREST\Lib\License\SendMetricsAction;
use Phalcon\Di\Injectable;

/**
 * Class LicenseManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class LicenseManagementProcessor extends Injectable
{

    /**
     * Process the license callback.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data = $request['data'];
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'resetKey':
                $res = ResetLicenseAction::main();
                break;
            case 'processUserRequest':
                $res = ProcessUserRequestAction::main($data);
                break;
            case 'getLicenseInfo':
                $res = GetLicenseInfoAction::main();
                break;
            case 'getMikoPBXFeatureStatus':
                $res = GetMikoPBXFeatureStatusAction::main();
                break;
            case 'captureFeatureForProductId':
                $res = CaptureFeatureForProductIdAction::main($data);
                break;
            case 'sendPBXMetrics':
                $res = SendMetricsAction::main();
                break;
            case 'ping':
                $res = PingAction::main();
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }
}
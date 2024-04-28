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


use MikoPBX\PBXCoreREST\Lib\Sip\GetPeersStatusesAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetPeerStatusAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetRegistryAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetSipSecretAction;
use Phalcon\Di\Injectable;

/**
 * Class SIPStackProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SIPStackProcessor extends Injectable
{
    /**
     * Processes SIP requests
     *
     * @param array $request The request data
     *   - action: The action to be performed
     *   - data: Additional data related to the action
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
            case 'getPeersStatuses':
                $res = GetPeersStatusesAction::main();
                break;
            case 'getSipPeer':
                if (!empty($data['peer'])) {
                    $res = GetPeerStatusAction::main($data['peer']);
                } else {
                    $res->messages['error'][] = 'Empty peer value in POST/GET data';
                }
                break;
            case 'getRegistry':
                $res = GetRegistryAction::main();
                break;
            case 'getSecret':
                if (!empty($data['number'])) {
                    $res = GetSipSecretAction::main($data['number']);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
                break;
        }

        $res->function = $action;

        return $res;
    }

}
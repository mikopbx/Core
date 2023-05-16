<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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


use MikoPBX\Common\Models\Iax;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class IAXStackProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class IAXStackProcessor extends Injectable
{
    /**
     * Process the IAX callback request.
     *
     * @param array $request The request data.
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        switch ($action) {
            case 'getRegistry':
                $res = IAXStackProcessor::getRegistry();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in iaxCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Get the IAX registry statuses.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getRegistry(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $peers  = [];
        $providers = Iax::find();
        foreach ($providers as $provider) {
            $peers[] = [
                'state'      => 'OFF',
                'id'         => $provider->uniqid,
                'username'   => trim($provider->username),
                'host'       => trim($provider->host),
                'noregister' => $provider->noregister,
            ];
        }

        if (Iax::findFirst("disabled = '0'") !== null) {
            // Find them over AMI
            $am       = Util::getAstManager('off');
            $amiRegs  = $am->IAXregistry(); // Registrations
            $amiPeers = $am->IAXpeerlist(); // Peers
            foreach ($amiPeers as $amiPeer) {
                $key = array_search($amiPeer['ObjectName'], array_column($peers, 'id'), true);
                if ($key !== false) {
                    $currentPeer = &$peers[$key];
                    if ($currentPeer['noregister'] === '1') {
                        // Peer without registration.
                        $arr_status                   = explode(' ', $amiPeer['Status']);
                        $currentPeer['state']         = strtoupper($arr_status[0]);
                        $currentPeer['time-response'] = strtoupper(str_replace(['(', ')'], '', $arr_status[1]));
                    } else {
                        $currentPeer['state'] = 'Error register.';
                        // Parse active registrations
                        foreach ($amiRegs as $reg) {
                            if (
                                strcasecmp($reg['Addr'], $currentPeer['host']) === 0
                                && strcasecmp($reg['Username'], $currentPeer['username']) === 0
                            ) {
                                $currentPeer['state'] = $reg['State'];
                                break;
                            }
                        }
                    }
                }
            }
        }

        $res->data = $peers;
        $res->success = true;

        return $res;
    }
}
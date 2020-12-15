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

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class SIPStackProcessor extends Injectable
{
    /**
     * Processes SIP requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data   = $request['data'];

        switch ($action) {
            case 'getPeersStatuses':
                $res = self::getPeersStatuses();
                break;
            case 'getSipPeer':
                $res = self::getPeerStatus($data['peer']);
                break;
            case 'getRegistry':
                $res = self::getRegistry();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in sipCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Получение статусов SIP пиров.
     *
     * @return PBXApiResult
     */
    public static function getPeersStatuses(): PBXApiResult
    {
        $am     = Util::getAstManager('off');
        $peers  = $am->getPjSipPeers();

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data = $peers;
        return $res;
    }

    /**
     * Gets peer status
     *
     * @param $peer
     *
     * @return PBXApiResult
     */
    public static function getPeerStatus($peer): PBXApiResult
    {
        $am = Util::getAstManager('off');
        $peers = $am->getPjSipPeer($peer);

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $res->data = $peers;
        return $res;
    }

    /**
     * Ger SIP Registry status
     *
     * @return PBXApiResult
     */
    public static function getRegistry(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $am         = Util::getAstManager('off');
        $peers      = $am->getPjSipRegistry();
        $providers  = Sip::find("type = 'friend'");
        foreach ($providers as $provider) {
            if ($provider->disabled === '1') {
                $peers[] = [
                    'state'    => 'OFF',
                    'id'       => $provider->uniqid,
                    'username' => $provider->username,
                    'host'     => $provider->host,
                ];
                continue;
            }
            if ($provider->noregister === '1') {
                $peers_status = $am->getPjSipPeer($provider->uniqid);
                $peers[] = [
                    'state'    => $peers_status['state'],
                    'id'       => $provider->uniqid,
                    'username' => $provider->username,
                    'host'     => $provider->host,
                ];
                continue;
            }
            foreach ($peers as &$peer) {
                if(!empty($peer['id'])){
                    continue;
                }
                if ($peer['host'] !== $provider->host || $peer['username'] !== $provider->username) {
                    continue;
                }
                $peer['id'] = $provider->uniqid;
            }
            unset($peer);
        }
        $res->data = $peers;
        $res->success = true;
        $res->processor = __METHOD__;
        return $res;
    }
}
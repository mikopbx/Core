<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
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
    public static function sipCallBack(array $request): PBXApiResult
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
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class SIPStackProcessor extends Injectable
{
    /**
     * Получение статусов SIP пиров.
     *
     * @return PBXApiResult
     */
    public static function getPeersStatuses(): PBXApiResult
    {
        $am = Util::getAstManager('off');
        $peers = $am->getPjSipPeers();
        $am->Logoff();

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
        $am->Logoff();

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
        $am->Logoff();
        $res->data = $peers;
        $res->success = true;
        $res->processor = __METHOD__;
        return $res;
    }
}
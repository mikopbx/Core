<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\Iax;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class IAXStackProcessor extends Injectable
{
    /**
     * Processes IAX requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
     * Получение статусов регистраций IAX
     *
     * @return PBXApiResult
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
                        // Пир без регистрации.
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
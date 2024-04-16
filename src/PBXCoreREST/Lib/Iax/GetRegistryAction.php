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

namespace MikoPBX\PBXCoreREST\Lib\Iax;

use MikoPBX\Common\Models\Iax;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Retrieves the statuses of IAX providers registration.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Iax
 */
class GetRegistryAction extends \Phalcon\Di\Injectable
{
    /**
     * Retrieves the statuses of IAX providers registration.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;


        try {
            $peers = [];
            $providers = Iax::find();
            foreach ($providers as $provider) {
                $peers[] = [
                    'state' => 'OFF',
                    'id' => $provider->uniqid,
                    'username' => trim($provider->username),
                    'host' => trim($provider->host),
                    'noregister' => $provider->noregister,
                ];
            }

            if (Iax::findFirst("disabled = '0'") !== null) {
                // Find them over AMI
                $am = Util::getAstManager('off');
                $amiRegs = $am->IAXregistry(); // Registrations
                $amiPeers = $am->IAXpeerlist(); // Peers
                foreach ($amiPeers as $amiPeer) {
                    $key = array_search($amiPeer['ObjectName'], array_column($peers, 'id'), true);
                    if ($key !== false) {
                        $currentPeer = &$peers[$key];
                        if ($currentPeer['noregister'] === '1') {
                            // Peer without registration.
                            $arr_status = explode(' ', $amiPeer['Status']);
                            $currentPeer['state'] = strtoupper($arr_status[0]);
                            // Check if the expected index exists before trying to access it.
                            if (isset($arr_status[1])) {
                                $currentPeer['time-response'] = strtoupper(str_replace(['(', ')'], '', $arr_status[1]));
                            } else {
                                // Handle the case where $arr_status[1] is not set.
                                // You might want to assign a default value or handle this scenario appropriately.
                                $currentPeer['time-response'] = 'N/A';
                            }
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
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages[] = $e->getMessage();
        }
        return $res;
    }
}
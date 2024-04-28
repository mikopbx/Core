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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Retrieves the statuses of SIP providers registration.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sip
 */
class GetRegistryAction extends \Phalcon\Di\Injectable
{
    /**
     * Retrieves the statuses of SIP providers registration.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $am = Util::getAstManager('off');
            $peers = $am->getPjSipRegistry();
            $providers = Sip::find("type = 'friend'");
            foreach ($providers as $provider) {
                if ($provider->disabled === '1') {
                    $peers[] = [
                        'state' => 'OFF',
                        'id' => $provider->uniqid,
                        'username' => $provider->username,
                        'host' => $provider->host,
                    ];
                    continue;
                }
                if ($provider->registration_type === Sip::REG_TYPE_INBOUND || $provider->registration_type === Sip::REG_TYPE_NONE) {
                    $peers_status = $am->getPjSipPeer($provider->uniqid);
                    $peers[] = [
                        'state' => ($peers_status['state'] === 'OK' && $provider->registration_type === Sip::REG_TYPE_INBOUND) ? 'REGISTERED' : $peers_status['state'],
                        'id' => $provider->uniqid,
                        'username' => $provider->username,
                        'host' => $provider->host,
                    ];
                    continue;
                }
                foreach ($peers as &$peer) {
                    if (!empty($peer['id'])) {
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
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages[] = $e->getMessage();
        }
        return $res;
    }
}
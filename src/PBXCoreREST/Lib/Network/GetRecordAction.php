<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting single network interface by ID
 *
 * @api {get} /pbxcore/api/v3/network/:id Get network interface
 * @apiVersion 3.0.0
 * @apiName GetNetworkInterface
 * @apiGroup Network
 *
 * @apiParam {String} id Interface ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Interface data
 * @apiSuccess {String} data.id Unique identifier
 * @apiSuccess {String} data.interface Physical interface name
 * @apiSuccess {String} data.name Interface display name
 * @apiSuccess {String} data.vlanid VLAN ID
 * @apiSuccess {String} data.ipaddr IP address
 * @apiSuccess {String} data.subnet Subnet mask
 * @apiSuccess {String} data.gateway Gateway IP
 * @apiSuccess {String} data.dhcp DHCP enabled flag
 * @apiSuccess {String} data.internet Internet interface flag
 */
class GetRecordAction
{
    /**
     * Get network interface by ID
     *
     * @param string|null $id Interface ID
     * @return PBXApiResult
     */
    public static function main(?string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // If no ID provided, return template for new interface
            if (empty($id)) {
                $res->data = [
                    'id' => '',
                    'interface' => '',
                    'name' => '',
                    'vlanid' => '4095',
                    'subnet' => '0',
                    'ipaddr' => '',
                    'gateway' => '',
                    'hostname' => '',
                    'domain' => '',
                    'primarydns' => '',
                    'secondarydns' => '',
                    'dhcp' => '1',
                    'disabled' => '0',
                    'internet' => '0',
                    'topology' => '',
                    'extipaddr' => '',
                    'exthostname' => '',
                    'isNew' => true
                ];
                $res->success = true;
                return $res;
            }

            $interface = LanInterfaces::findFirstById($id);

            if ($interface === null) {
                $res->messages['error'][] = "Network interface with ID $id not found";
                return $res;
            }

            $data = $interface->toArray();

            // Add computed fields
            $data['isDeletable'] = false;
            if ($interface->interface !== '') {
                // Check if this interface has VLANs
                $vlanCount = LanInterfaces::count([
                    'interface = :interface: AND disabled = :disabled:',
                    'bind' => [
                        'interface' => $interface->interface,
                        'disabled' => '0'
                    ]
                ]);
                $data['isDeletable'] = $vlanCount > 1 && $interface->internet !== '1';
            }

            $data['isInternet'] = $interface->internet === '1';
            $data['isDhcp'] = $interface->dhcp === '1';
            $data['isNew'] = false;

            $res->data = $data;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
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
use MikoPBX\Common\Models\NetworkStaticRoutes;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Network as NetworkSystem;
use MikoPBX\Core\System\System;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting complete network configuration for form
 *
 * Returns all network interfaces, NAT settings, and ports configuration
 *
 * @api {get} /pbxcore/api/v3/network:getConfig Get network configuration
 * @apiVersion 3.0.0
 * @apiName GetNetworkConfig
 * @apiGroup Network
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Configuration data
 * @apiSuccess {Array} data.interfaces Array of network interfaces
 * @apiSuccess {Object} data.nat NAT settings
 * @apiSuccess {Object} data.ports Port settings
 * @apiSuccess {Object} data.template Template for new interface
 * @apiSuccess {Array} data.deletableInterfaces List of interfaces that can be deleted
 * @apiSuccess {Boolean} data.isDocker Docker environment flag
 */
class GetConfigAction
{
    /**
     * Get complete network configuration
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get all network interfaces
            $networkInterfaces = LanInterfaces::find();
            $interfaces = [];
            $deletableInterfaces = [];
            $availableInterfaces = []; // Collect available interfaces for static routes

            // Initialize Network system for getting current IP addresses
            $networkSystem = new NetworkSystem();

            foreach ($networkInterfaces as $record) {
                if ($record->disabled !== '1') {
                    $interfaceData = $record->toArray();
                    // Convert string values to boolean
                    $interfaceData['dhcp'] = $interfaceData['dhcp'] === '1';
                    $interfaceData['internet'] = $interfaceData['internet'] === '1';
                    $interfaceData['disabled'] = $interfaceData['disabled'] === '1';

                    // Ensure subnet has a valid value
                    if (empty($interfaceData['subnet']) || $interfaceData['subnet'] === '0') {
                        $interfaceData['subnet'] = '24';
                    }

                    // Get current IP address from system (especially useful when DHCP is enabled)
                    // Determine the actual interface name (including VLAN)
                    $actualInterfaceName = $interfaceData['interface'];
                    if ($interfaceData['vlanid'] > 0) {
                        $actualInterfaceName = "vlan{$interfaceData['vlanid']}";
                    }

                    try {
                        $currentInterface = $networkSystem->getInterface($actualInterfaceName);
                        // Add current system values (useful when DHCP is enabled and DB values are empty)
                        $interfaceData['currentIpaddr'] = $currentInterface['ipaddr'] ?? '';
                        $interfaceData['currentSubnet'] = $currentInterface['subnet'] ?? '';
                        $interfaceData['currentGateway'] = $currentInterface['gateway'] ?? '';

                        // When DHCP is enabled, use current values from system instead of DB
                        // This ensures we always show actual DHCP-provided values
                        if ($interfaceData['dhcp']) {
                            if (!empty($interfaceData['currentIpaddr'])) {
                                $interfaceData['ipaddr'] = $interfaceData['currentIpaddr'];
                            }
                            if (!empty($interfaceData['currentSubnet'])) {
                                $interfaceData['subnet'] = $interfaceData['currentSubnet'];
                            }
                        }
                    } catch (\Throwable $e) {
                        // If we can't get current interface info, leave fields empty
                        $interfaceData['currentIpaddr'] = '';
                        $interfaceData['currentSubnet'] = '';
                        $interfaceData['currentGateway'] = '';
                    }

                    $interfaces[] = $interfaceData;

                    // Build available interface for static routes dropdown
                    // Use the actual interface name (with VLAN if applicable)
                    $interfaceName = $record->interface;
                    if ($record->vlanid > 0) {
                        $interfaceName = "vlan{$record->vlanid}";
                    }
                    $label = !empty($record->name) ? "{$interfaceName} ({$record->name})" : $interfaceName;
                    $availableInterfaces[] = [
                        'value' => $interfaceName,
                        'label' => $label
                    ];
                }
            }

            // Find interfaces that can be deleted (have multiple VLANs)
            $countInterfaces = LanInterfaces::count(['group' => 'interface']);
            foreach ($countInterfaces as $record) {
                if ($record->rowcount > 1) {
                    $deletableInterfaces[] = $record->interface;
                }
            }

            // Get internet interface
            $internetInterface = LanInterfaces::findFirst(['internet = :internet:', 'bind' => ['internet' => '1']]);
            $internetInterfaceId = $internetInterface ? $internetInterface->id : 1;

            // Create template for new interface
            $template = [
                'id' => 0,
                'interface' => '',
                'name' => '',
                'vlanid' => '4095',
                'subnet' => '24',
                'ipaddr' => '',
                'gateway' => '',
                'hostname' => '',
                'domain' => '',
                'primarydns' => '',
                'secondarydns' => '',
                'dhcp' => true,
                'disabled' => false,
                'internet' => false,
                'topology' => '',
                'extipaddr' => '',
                'exthostname' => ''
            ];

            // Get NAT settings
            $natSettings = [
                'usenat' => $internetInterface && $internetInterface->topology === LanInterfaces::TOPOLOGY_PRIVATE,
                'extipaddr' => $internetInterface ? $internetInterface->extipaddr : '',
                'exthostname' => $internetInterface ? $internetInterface->exthostname : '',
                'AUTO_UPDATE_EXTERNAL_IP' => PbxSettings::getValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP) === '1',
            ];

            // Get port settings
            // WHY: Use constant values as keys (e.g., 'externalSIPPort' not 'EXTERNAL_SIP_PORT')
            // This matches SaveConfigAction expectations and eliminates JS mapping
            $portSettings = [
                PbxSettings::SIP_PORT => PbxSettings::getValueByKey(PbxSettings::SIP_PORT),
                PbxSettings::EXTERNAL_SIP_PORT => PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_PORT),
                PbxSettings::TLS_PORT => PbxSettings::getValueByKey(PbxSettings::TLS_PORT),
                PbxSettings::EXTERNAL_TLS_PORT => PbxSettings::getValueByKey(PbxSettings::EXTERNAL_TLS_PORT),
                PbxSettings::RTP_PORT_FROM => PbxSettings::getValueByKey(PbxSettings::RTP_PORT_FROM),
                PbxSettings::RTP_PORT_TO => PbxSettings::getValueByKey(PbxSettings::RTP_PORT_TO),
            ];

            // Load static routes (ordered by priority)
            $staticRoutes = NetworkStaticRoutes::find([
                'order' => 'priority ASC'
            ]);

            $routesData = [];
            foreach ($staticRoutes as $route) {
                $routesData[] = [
                    'id' => (string)$route->id,
                    'network' => $route->network,
                    'subnet' => $route->subnet,
                    'gateway' => $route->gateway,
                    'interface' => $route->interface ?? '',
                    'description' => $route->description ?? '',
                    'priority' => $route->priority
                ];
            }

            $res->data = [
                'interfaces' => $interfaces,
                'template' => $template,
                'internetInterfaceId' => $internetInterfaceId,
                'deletableInterfaces' => $deletableInterfaces,
                'nat' => $natSettings,
                'ports' => $portSettings,
                'isDocker' => System::isDocker(),
                'staticRoutes' => $routesData,
                'availableInterfaces' => $availableInterfaces,
            ];

            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
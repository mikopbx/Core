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

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\System;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class GetListAction
 * 
 * Returns list of all firewall rules including both custom and default rules.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class GetListAction
{
    /**
     * Get list of all firewall rules
     *
     * @param array<string, mixed> $data Request parameters (limit, offset, search)
     * @return PBXApiResult The result containing list of firewall rules
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $calculator = new \MikoPBX\AdminCabinet\Library\Cidr();
            $localAddresses = [];
            $localAddresses[] = '0.0.0.0/0';

            // Add IPv6 "all networks" if IPv6 is enabled
            if (LanInterfaces::isIpv6Enabled()) {
                $localAddresses[] = '::/0';
            }

            // Get local network interfaces
            $conditions = 'disabled=0 AND internet=0';
            $networkInterfaces = LanInterfaces::find($conditions);
            foreach ($networkInterfaces as $interface) {
                if (empty($interface->ipaddr)) {
                    continue;
                }
                
                if (!str_contains($interface->subnet, '.')) {
                    $localAddresses[] = $calculator->cidr2network(
                        $interface->ipaddr,
                        intval($interface->subnet)
                    ) . '/' . $interface->subnet;
                } else {
                    $cidr = $calculator->netmask2cidr($interface->subnet);
                    $localAddresses[] = $calculator->cidr2network($interface->ipaddr, $cidr) . '/' . $cidr;
                }
            }
            
            $defaultRules = FirewallRules::getDefaultRules();
            $networksTable = [];
            
            // Get all network filters from database
            $networkFilters = NetworkFilters::find();
            $networkFiltersStoredInDB = ($networkFilters->count() > 0);
            
            foreach ($networkFilters as $filter) {
                $filterData = [
                    'id' => $filter->id,
                    'description' => $filter->description,
                    'permit' => $filter->permit,
                    'deny' => $filter->deny,
                    // Convert '0'/'1' strings to boolean for REST API
                    'newer_block_ip' => $filter->newer_block_ip === '1',
                    'local_network' => $filter->local_network === '1',
                    'permanent' => false,
                    'rules' => []
                ];
                
                // Format network address
                $permitParts = explode('/', $filter->permit);
                $network = $permitParts[0];
                $subnet = $permitParts[1];

                // Detect IP version to apply correct normalization
                $version = IpAddressHelper::getIpVersion($network);

                if ($version === IpAddressHelper::IP_VERSION_4) {
                    // IPv4: Normalize using Cidr calculator
                    if (!str_contains($subnet, '.')) {
                        $filterData['network'] = $calculator->cidr2network($network, intval($subnet));
                        $filterData['subnet'] = $subnet;
                    } else {
                        $cidr = $calculator->netmask2cidr($subnet);
                        $filterData['network'] = $calculator->cidr2network($network, $cidr);
                        $filterData['subnet'] = (string)$cidr;
                    }
                } else {
                    // IPv6: Use address as-is (already validated)
                    $filterData['network'] = $network;
                    $filterData['subnet'] = $subnet;
                }
                
                // Fill default values for categories
                foreach ($defaultRules as $key => $value) {
                    $filterData['rules'][$key] = [
                        'name' => empty($value['shortName']) ? $key : $value['shortName'],
                        // Convert action to boolean for REST API (allow = true, block = false)
                        'action' => ($value['action'] ?? 'block') === 'allow',
                        'ports' => self::getPortsInfo($value)
                    ];
                }
                
                // Fill saved values
                $firewallRules = $filter->FirewallRules;
                foreach ($firewallRules as $rule) {
                    // Convert action to boolean for REST API
                    $filterData['rules'][$rule->category]['action'] = $rule->action === 'allow';
                    if (!array_key_exists('name', $filterData['rules'][$rule->category])) {
                        $filterData['rules'][$rule->category]['name'] = $rule->category;
                    }
                }
                
                $networksTable[] = $filterData;
            }
            
            // Add default filters for local addresses
            foreach ($localAddresses as $localAddress) {
                $existsPersistentRecord = false;
                foreach ($networksTable as &$network) {
                    // Compare network with subnet mask (e.g., "0.0.0.0/0" vs "0.0.0.0/0")
                    $networkWithMask = $network['network'] . '/' . $network['subnet'];
                    if ($networkWithMask === $localAddress) {
                        $network['permanent'] = true;
                        $existsPersistentRecord = true;
                        break;
                    }
                }
                
                if (!$existsPersistentRecord) {
                    // Determine if this is an "all networks" address
                    $isAllNetworks = ($localAddress === '0.0.0.0/0' || $localAddress === '::/0');

                    // Set appropriate description based on address type using translations
                    $di = \Phalcon\Di\Di::getDefault();
                    $translation = $di->get('translation');

                    $description = $translation->_('fw_LocalNetworkRuleDescription');
                    if ($localAddress === '0.0.0.0/0') {
                        $description = $translation->_('fw_AllIPv4NetworkRule');
                    } elseif ($localAddress === '::/0') {
                        $description = $translation->_('fw_AllIPv6NetworkRule');
                    }

                    // Extract network and subnet from localAddress (e.g., "0.0.0.0/0" -> network="0.0.0.0", subnet="0")
                    $localParts = explode('/', $localAddress);
                    $localNetwork = $localParts[0];
                    $localSubnet = $localParts[1] ?? '0';

                    $defaultFilter = [
                        'id' => '',
                        'permanent' => true,
                        'network' => $localNetwork,
                        'subnet' => $localSubnet,
                        'permit' => $localAddress,
                        'deny' => $localAddress === '::/0' ? '::/0' : '0.0.0.0/0',
                        'newer_block_ip' => '0',
                        'local_network' => $isAllNetworks ? '0' : '1',
                        'description' => $description,
                        'rules' => []
                    ];
                    
                    foreach ($defaultRules as $key => $value) {
                        $defaultFilter['rules'][$key] = [
                            'name' => empty($value['shortName']) ? $key : $value['shortName'],
                            'action' => $networkFiltersStoredInDB ? 'block' : $value['action'],
                            'ports' => self::getPortsInfo($value)
                        ];
                    }
                    
                    $networksTable[] = $defaultFilter;
                }
            }
            
            // Sort networks
            usort($networksTable, [__CLASS__, 'sortArrayByNetwork']);
            
            // Apply pagination if requested
            $offset = isset($data['offset']) ? (int)$data['offset'] : 0;
            $limit = isset($data['limit']) ? (int)$data['limit'] : 0;
            
            $total = count($networksTable);
            
            if ($limit > 0) {
                $networksTable = array_slice($networksTable, $offset, $limit);
            }
            
            // Add system status
            $res->data = [
                'items' => $networksTable,
                'total' => $total,
                'firewallEnabled' => PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED),
                'fail2banEnabled' => PbxSettings::getValueByKey(PbxSettings::PBX_FAIL2BAN_ENABLED),
                'isDocker' => System::isDocker(),
                'dockerSupportedServices' => ['WEB', 'AMI', 'SIP & RTP', 'IAX']
            ];
            
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
    
    /**
     * Compare two network entries for sorting
     *
     * @param array<string, mixed> $a First network entry
     * @param array<string, mixed> $b Second network entry
     * @return int Sort order
     */
    private static function sortArrayByNetwork(array $a, array $b): int
    {
        // Check if entries are "all networks" addresses (compare with subnet mask)
        $aNetworkWithMask = $a['network'] . '/' . $a['subnet'];
        $bNetworkWithMask = $b['network'] . '/' . $b['subnet'];
        $aIsAllNetworks = ($aNetworkWithMask === '0.0.0.0/0' || $aNetworkWithMask === '::/0');
        $bIsAllNetworks = ($bNetworkWithMask === '0.0.0.0/0' || $bNetworkWithMask === '::/0');

        // If second entry is permanent and first is not "all networks"
        if ($b['permanent'] && !$aIsAllNetworks) {
            return 1;
        }

        // If second entry is "all networks"
        if ($bIsAllNetworks) {
            return 1;
        }

        return -1;
    }
    
    /**
     * Get ports information for a category
     *
     * @param array<string, mixed> $categoryData Category configuration
     * @return array<int, array<string, mixed>> Ports information
     */
    private static function getPortsInfo(array $categoryData): array
    {
        $ports = [];
        $protectedPorts = FirewallRules::getProtectedPortSet();
        
        if (isset($categoryData['rules'])) {
            foreach ($categoryData['rules'] as $rule) {
                $portFrom = is_string($rule['portfrom']) && isset($protectedPorts[$rule['portfrom']]) 
                    ? $protectedPorts[$rule['portfrom']] 
                    : $rule['portfrom'];
                $portTo = is_string($rule['portto']) && isset($protectedPorts[$rule['portto']]) 
                    ? $protectedPorts[$rule['portto']] 
                    : $rule['portto'];
                    
                if ($rule['protocol'] === 'icmp') {
                    $ports[] = [
                        'protocol' => 'ICMP'
                    ];
                } elseif ($portFrom == $portTo) {
                    $ports[] = [
                        'port' => $portFrom,
                        'protocol' => strtoupper($rule['protocol'])
                    ];
                } else {
                    $ports[] = [
                        'range' => "$portFrom-$portTo",
                        'protocol' => strtoupper($rule['protocol'])
                    ];
                }
            }
        }
        
        return $ports;
    }
}
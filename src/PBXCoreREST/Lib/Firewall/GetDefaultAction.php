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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class GetDefaultAction
 * 
 * Returns default values for creating a new firewall rule.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class GetDefaultAction
{
    /**
     * Get default values for a new firewall rule
     *
     * @return PBXApiResult The result containing default values
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get default firewall rules configuration
            $defaultRules = FirewallRules::getDefaultRules();

            // Build simple current rules map (just boolean values)
            $currentRules = [];
            foreach ($defaultRules as $category => $categoryData) {
                // Simple boolean: true = allow, false = block
                $currentRules[$category] = ($categoryData['action'] ?? 'allow') === 'allow';
            }
            
            // Get local network suggestion
            $localNetwork = self::getLocalNetworkSuggestion();
            
            // Parse network and subnet from CIDR
            $network = '0.0.0.0';
            $subnet = '0';
            if (preg_match('/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/', $localNetwork, $matches)) {
                $network = $matches[1];
                $subnet = $matches[2];
            }
            
            $res->data = [
                'id' => '',
                'network' => $network,
                'subnet' => $subnet,
                'permit' => $localNetwork,
                'deny' => '0.0.0.0/0',
                'description' => '',
                'newer_block_ip' => false,
                'local_network' => false,
                'currentRules' => $currentRules,  // Simple boolean map
                'availableRules' => $defaultRules,  // Full template with metadata
                'isDocker' => Util::isDocker(),
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
     * Get local network suggestion based on LAN interfaces
     *
     * @return string Default network CIDR
     */
    private static function getLocalNetworkSuggestion(): string
    {
        // Try to get a local network from configured interfaces
        $conditions = 'disabled=0 AND internet=0'; // Local networks only
        $networkInterfaces = LanInterfaces::find($conditions);
        
        foreach ($networkInterfaces as $interface) {
            if (!empty($interface->ipaddr) && !empty($interface->subnet)) {
                // Return the first local network found
                if (str_contains($interface->subnet, '.')) {
                    // Convert netmask to CIDR
                    $cidr = self::netmaskToCidr($interface->subnet);
                    $network = self::getNetworkAddress($interface->ipaddr, $cidr);
                    return "$network/$cidr";
                } else {
                    // Already in CIDR format
                    $network = self::getNetworkAddress($interface->ipaddr, (int)$interface->subnet);
                    return "$network/{$interface->subnet}";
                }
            }
        }
        
        // Default to all networks if no local network found
        return '0.0.0.0/0';
    }
    
    /**
     * Convert netmask to CIDR notation
     *
     * @param string $netmask Netmask (e.g., "255.255.255.0")
     * @return int CIDR prefix (e.g., 24)
     */
    private static function netmaskToCidr(string $netmask): int
    {
        $bits = 0;
        $netmask = explode('.', $netmask);
        
        foreach ($netmask as $octet) {
            $bits += strlen(str_replace('0', '', decbin((int)$octet)));
        }
        
        return $bits;
    }
    
    /**
     * Get network address from IP and CIDR
     *
     * @param string $ip IP address
     * @param int $cidr CIDR prefix
     * @return string Network address
     */
    private static function getNetworkAddress(string $ip, int $cidr): string
    {
        $ip = ip2long($ip);
        $mask = -1 << (32 - $cidr);
        $network = $ip & $mask;
        
        return long2ip($network);
    }
}
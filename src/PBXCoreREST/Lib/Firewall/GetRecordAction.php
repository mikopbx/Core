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
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class GetRecordAction
 * 
 * Returns a single firewall rule by ID.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class GetRecordAction
{
    /**
     * Get a single firewall rule by ID
     *
     * @param string $id NetworkFilter ID
     * @return PBXApiResult The result containing the firewall rule
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            if (empty($id)) {
                $res->messages['error'][] = 'ID is required';
                $res->success = false;
                return $res;
            }
            
            $networkFilter = NetworkFilters::findFirstById($id);
            if (!$networkFilter) {
                $res->messages['error'][] = "Firewall rule with ID '$id' not found";
                $res->success = false;
                return $res;
            }
            
            // Build response data
            $permitParts = explode('/', $networkFilter->permit);
            $data = [
                'id' => $networkFilter->id,
                'network' => $permitParts[0],
                'subnet' => $permitParts[1],
                'permit' => $networkFilter->permit,
                'deny' => $networkFilter->deny,
                'description' => $networkFilter->description,
                // Convert '0'/'1' strings to boolean for REST API
                'newer_block_ip' => $networkFilter->newer_block_ip === '1',
                'local_network' => $networkFilter->local_network === '1',
                'rules' => []
            ];
            
            // Get default rules structure
            $defaultRules = FirewallRules::getDefaultRules();
            
            // Fill default values for all categories
            foreach ($defaultRules as $category => $categoryData) {
                $data['rules'][$category] = [
                    'name' => empty($categoryData['shortName']) ? $category : $categoryData['shortName'],
                    // Convert action to boolean for REST API (allow = true, block = false)
                    'action' => ($categoryData['action'] ?? 'block') === 'allow',
                    'ports' => self::getPortsInfo($categoryData)
                ];
            }
            
            // Override with saved values
            $firewallRules = $networkFilter->FirewallRules;
            foreach ($firewallRules as $rule) {
                // Convert action to boolean for REST API
                $data['rules'][$rule->category]['action'] = $rule->action === 'allow';
                if (!isset($data['rules'][$rule->category]['name'])) {
                    $data['rules'][$rule->category]['name'] = $rule->category;
                }
            }
            
            // Add system information
            $data['isDocker'] = Util::isDocker();
            $data['dockerSupportedServices'] = ['WEB', 'AMI', 'SIP & RTP', 'IAX'];
            
            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
    
    /**
     * Get ports information for a category
     *
     * @param array $categoryData Category configuration
     * @return array Ports information
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
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

use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Class CreateRecordAction
 * 
 * Creates a new firewall rule (NetworkFilter and associated FirewallRules).
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class CreateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Create a new firewall rule
     *
     * @param array $data Rule data
     * @return PBXApiResult The result containing the created rule ID
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = Di::getDefault();
        $db = $di->get('db');
        
        try {
            $db->begin();
            
            // Create NetworkFilter
            $networkFilter = new NetworkFilters();
            $calculator = new Cidr();
            
            // Process network/subnet
            if (isset($data['network']) && isset($data['subnet'])) {
                $networkFilter->permit = $calculator->cidr2network(
                    $data['network'],
                    intval($data['subnet'])
                ) . '/' . $data['subnet'];
            } elseif (isset($data['permit'])) {
                $networkFilter->permit = $data['permit'];
            } else {
                $networkFilter->permit = '0.0.0.0/0';
            }
            
            // Convert boolean fields to '0'/'1' strings
            $data = self::convertBooleanFields($data, ['newer_block_ip', 'local_network']);
            
            $networkFilter->deny = $data['deny'] ?? '0.0.0.0/0';
            $networkFilter->description = $data['description'] ?? '';
            $networkFilter->newer_block_ip = $data['newer_block_ip'] ?? '0';
            $networkFilter->local_network = $data['local_network'] ?? '0';
            
            if (!$networkFilter->save()) {
                $errors = $networkFilter->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                $db->rollback();
                $res->success = false;
                return $res;
            }
            
            // Create FirewallRules
            if (!self::createFirewallRules($networkFilter->id, $data['rules'] ?? [])) {
                $res->messages['error'][] = 'Failed to create firewall rules';
                $db->rollback();
                $res->success = false;
                return $res;
            }
            
            $db->commit();
            
            // Firewall will be reloaded automatically by model events

            $res->data = ['id' => $networkFilter->id];
            $res->success = true;
            // Add reload URL for frontend navigation
            $res->reload = "firewall/modify/{$networkFilter->id}";
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
    
    /**
     * Create FirewallRules for a NetworkFilter
     *
     * @param string $networkFilterId NetworkFilter ID
     * @param array $rulesData Rules configuration
     * @return bool Success status
     */
    private static function createFirewallRules(string $networkFilterId, array $rulesData): bool
    {
        $defaultRules = FirewallRules::getDefaultRules();
        
        foreach ($defaultRules as $category => $categoryData) {
            foreach ($categoryData['rules'] as $rule) {
                $firewallRule = new FirewallRules();
                $firewallRule->networkfilterid = $networkFilterId;
                $firewallRule->protocol = $rule['protocol'];
                $firewallRule->portfrom = $rule['portfrom'];
                $firewallRule->portto = $rule['portto'];
                $firewallRule->category = $category;
                $firewallRule->portFromKey = $rule['portFromKey'] ?? '';
                $firewallRule->portToKey = $rule['portToKey'] ?? '';
                
                // Get action from input data or use default
                if (isset($rulesData[$category])) {
                    if (is_array($rulesData[$category])) {
                        // Handle array format with 'action' key
                        $action = $rulesData[$category]['action'] ?? false;
                    } else {
                        // Handle simple format: "SIP" => true/false or "SIP" => "allow"/"block"
                        $action = $rulesData[$category];
                    }
                    
                    // Convert boolean to allow/block string
                    if (is_bool($action)) {
                        $firewallRule->action = $action ? 'allow' : 'block';
                    } else {
                        // Support legacy string format
                        $firewallRule->action = $action === 'allow' ? 'allow' : 'block';
                    }
                } else {
                    $firewallRule->action = $categoryData['action'] ?? 'block';
                }
                
                $firewallRule->description = "$firewallRule->action connection for $category";
                
                if (!$firewallRule->save()) {
                    return false;
                }
            }
        }
        
        return true;
    }
}
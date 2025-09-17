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
 * Class UpdateAction
 * 
 * Updates an existing firewall rule (NetworkFilter and associated FirewallRules).
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class UpdateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Update an existing firewall rule
     *
     * @param array $data Rule data including ID
     * @param bool $isPatch Whether this is a PATCH (partial) update
     * @return PBXApiResult The result of the update operation
     */
    public static function main(array $data, bool $isPatch = false): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = Di::getDefault();
        $db = $di->get('db');
        
        try {
            if (empty($data['id'])) {
                $res->messages['error'][] = 'ID is required';
                $res->success = false;
                return $res;
            }
            
            $networkFilter = NetworkFilters::findFirstById($data['id']);
            if (!$networkFilter) {
                $res->messages['error'][] = "Firewall rule with ID '{$data['id']}' not found";
                $res->success = false;
                return $res;
            }
            
            $db->begin();
            
            // Convert boolean fields to '0'/'1' strings
            $data = self::convertBooleanFields($data, ['newer_block_ip', 'local_network']);
            
            // Update NetworkFilter
            $calculator = new Cidr();
            
            // For PATCH, only update provided fields
            if ($isPatch) {
                if (isset($data['network']) && isset($data['subnet'])) {
                    $networkFilter->permit = $calculator->cidr2network(
                        $data['network'],
                        intval($data['subnet'])
                    ) . '/' . $data['subnet'];
                } elseif (isset($data['permit'])) {
                    $networkFilter->permit = $data['permit'];
                }
                
                if (isset($data['deny'])) {
                    $networkFilter->deny = $data['deny'];
                }
                if (isset($data['description'])) {
                    $networkFilter->description = $data['description'];
                }
                if (isset($data['newer_block_ip'])) {
                    $networkFilter->newer_block_ip = $data['newer_block_ip'];
                }
                if (isset($data['local_network'])) {
                    $networkFilter->local_network = $data['local_network'];
                }
            } else {
                // For PUT, update all fields
                if (isset($data['network']) && isset($data['subnet'])) {
                    $networkFilter->permit = $calculator->cidr2network(
                        $data['network'],
                        intval($data['subnet'])
                    ) . '/' . $data['subnet'];
                } elseif (isset($data['permit'])) {
                    $networkFilter->permit = $data['permit'];
                }
                
                $networkFilter->deny = $data['deny'] ?? '0.0.0.0/0';
                $networkFilter->description = $data['description'] ?? '';
                $networkFilter->newer_block_ip = $data['newer_block_ip'] ?? '0';
                $networkFilter->local_network = $data['local_network'] ?? '0';
            }
            
            if (!$networkFilter->save()) {
                $errors = $networkFilter->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                $db->rollback();
                $res->success = false;
                return $res;
            }
            
            // Update FirewallRules if rules data is provided
            if (isset($data['rules'])) {
                if (!self::updateFirewallRules($networkFilter->id, $data['rules'], $isPatch)) {
                    $res->messages['error'][] = 'Failed to update firewall rules';
                    $db->rollback();
                    $res->success = false;
                    return $res;
                }
            }
            
            $db->commit();
            
            // Firewall will be reloaded automatically by model events
            
            $res->data = ['id' => $networkFilter->id];
            $res->success = true;
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
    
    /**
     * Update FirewallRules for a NetworkFilter
     *
     * @param string $networkFilterId NetworkFilter ID
     * @param array $rulesData Rules configuration
     * @param bool $isPatch Whether this is a partial update
     * @return bool Success status
     */
    private static function updateFirewallRules(string $networkFilterId, array $rulesData, bool $isPatch): bool
    {
        // Get existing rules
        $existingRules = FirewallRules::find([
            'conditions' => 'networkfilterid = :id:',
            'bind' => ['id' => $networkFilterId]
        ]);
        
        // Create a map of existing rules by category
        $rulesMap = [];
        foreach ($existingRules as $rule) {
            if (!isset($rulesMap[$rule->category])) {
                $rulesMap[$rule->category] = [];
            }
            $rulesMap[$rule->category][] = $rule;
        }
        
        // Update rules
        foreach ($rulesData as $category => $categoryData) {
            if (isset($rulesMap[$category])) {
                // Update existing rules for this category
                foreach ($rulesMap[$category] as $rule) {
                    if (is_array($categoryData)) {
                        // Handle array format with 'action' key
                        $action = $categoryData['action'] ?? $rule->action;
                    } else {
                        // Handle simple format: "SIP" => true/false or "SIP" => "allow"/"block"
                        $action = $categoryData;
                    }
                    
                    // Convert boolean to allow/block string
                    if (is_bool($action)) {
                        $rule->action = $action ? 'allow' : 'block';
                    } else {
                        // Support legacy string format
                        $rule->action = $action === 'allow' ? 'allow' : 'block';
                    }
                    $rule->description = "$rule->action connection for $category";
                    
                    if (!$rule->save()) {
                        return false;
                    }
                }
            } elseif (!$isPatch) {
                // For PUT operation, create missing categories with default rules
                $defaultRules = FirewallRules::getDefaultRules();
                if (isset($defaultRules[$category])) {
                    foreach ($defaultRules[$category]['rules'] as $ruleData) {
                        $firewallRule = new FirewallRules();
                        $firewallRule->networkfilterid = $networkFilterId;
                        $firewallRule->protocol = $ruleData['protocol'];
                        $firewallRule->portfrom = $ruleData['portfrom'];
                        $firewallRule->portto = $ruleData['portto'];
                        $firewallRule->category = $category;
                        $firewallRule->portFromKey = $ruleData['portFromKey'] ?? '';
                        $firewallRule->portToKey = $ruleData['portToKey'] ?? '';
                        
                        if (is_array($categoryData)) {
                            // Handle array format with 'action' key
                            $action = $categoryData['action'] ?? false;
                        } else {
                            // Handle simple format: "SIP" => true/false or "SIP" => "allow"/"block"
                            $action = $categoryData;
                        }
                        
                        // Convert boolean to allow/block string
                        if (is_bool($action)) {
                            $firewallRule->action = $action ? 'allow' : 'block';
                        } else {
                            // Support legacy string format
                            $firewallRule->action = $action === 'allow' ? 'allow' : 'block';
                        }
                        
                        $firewallRule->description = "$firewallRule->action connection for $category";
                        
                        if (!$firewallRule->save()) {
                            return false;
                        }
                    }
                }
            }
        }
        
        // For PUT operation, ensure all default categories exist
        if (!$isPatch) {
            $defaultRules = FirewallRules::getDefaultRules();
            foreach ($defaultRules as $category => $categoryData) {
                if (!isset($rulesMap[$category]) && !isset($rulesData[$category])) {
                    // Create missing category with default action
                    foreach ($categoryData['rules'] as $ruleData) {
                        $firewallRule = new FirewallRules();
                        $firewallRule->networkfilterid = $networkFilterId;
                        $firewallRule->protocol = $ruleData['protocol'];
                        $firewallRule->portfrom = $ruleData['portfrom'];
                        $firewallRule->portto = $ruleData['portto'];
                        $firewallRule->category = $category;
                        $firewallRule->portFromKey = $ruleData['portFromKey'] ?? '';
                        $firewallRule->portToKey = $ruleData['portToKey'] ?? '';
                        $firewallRule->action = $categoryData['action'] ?? 'block';
                        $firewallRule->description = "$firewallRule->action connection for $category";
                        
                        if (!$firewallRule->save()) {
                            return false;
                        }
                    }
                }
            }
        }
        
        return true;
    }
}
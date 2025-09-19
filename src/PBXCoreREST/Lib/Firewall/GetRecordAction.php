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
                'currentRules' => []  // Simple boolean map: category => allow/block
            ];

            // Get default rules structure
            $defaultRules = FirewallRules::getDefaultRules();

            // Initialize currentRules with default values
            foreach ($defaultRules as $category => $categoryData) {
                // Simple boolean: true = allow, false = block
                $data['currentRules'][$category] = ($categoryData['action'] ?? 'block') === 'allow';
            }

            // Override with saved values from database
            $firewallRules = $networkFilter->FirewallRules;
            foreach ($firewallRules as $rule) {
                // Update with actual saved value
                $data['currentRules'][$rule->category] = $rule->action === 'allow';
            }
            
            // Add system information
            $data['availableRules'] = $defaultRules;  // All possible firewall rule templates
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
}
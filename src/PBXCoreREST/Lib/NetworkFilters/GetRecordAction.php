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

namespace MikoPBX\PBXCoreREST\Lib\NetworkFilters;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetRecordAction
 * 
 * Returns single network filter by ID
 * 
 * @package MikoPBX\PBXCoreREST\Lib\NetworkFilters
 */
class GetRecordAction
{
    /**
     * Get single network filter
     * 
     * @param array $data Request parameters with 'id'
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $id = $data['id'] ?? '';
            
            if (empty($id)) {
                $res->messages['error'][] = 'ID is required';
                $res->success = false;
                return $res;
            }
            
            $filter = NetworkFilters::findFirstById($id);
            
            if (!$filter) {
                $res->messages['error'][] = "Network filter with ID $id not found";
                $res->success = false;
                return $res;
            }
            
            $result = [
                'id' => $filter->id,
                'description' => $filter->description,
                'permit' => $filter->permit,
                'deny' => $filter->deny,
                'newer_block_ip' => $filter->newer_block_ip === '1',
                'local_network' => $filter->local_network === '1',
                'rules' => []
            ];
            
            // Get associated firewall rules
            $rules = $filter->FirewallRules;
            foreach ($rules as $rule) {
                $result['rules'][$rule->category] = [
                    'action' => $rule->action,
                    'portfrom' => $rule->portfrom,
                    'portto' => $rule->portto,
                    'protocol' => $rule->protocol
                ];
            }
            
            $res->data = $result;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
}
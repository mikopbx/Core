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
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetListAction
 * 
 * Returns list of all network filters
 * 
 * @package MikoPBX\PBXCoreREST\Lib\NetworkFilters
 */
class GetListAction
{
    /**
     * Get list of all network filters
     * 
     * @param array $data Request parameters (pagination, filters)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Build query conditions
            $conditions = [];
            $bind = [];
            
            // Apply filters if provided
            if (!empty($data['search'])) {
                $conditions[] = '(description LIKE :search: OR permit LIKE :search:)';
                $bind['search'] = '%' . $data['search'] . '%';
            }
            
            // Get filters
            $parameters = [
                'order' => 'id ASC'
            ];
            
            if (!empty($conditions)) {
                $parameters['conditions'] = implode(' AND ', $conditions);
                $parameters['bind'] = $bind;
            }
            
            $filters = NetworkFilters::find($parameters);
            $items = [];
            
            foreach ($filters as $filter) {
                $item = [
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
                    $item['rules'][$rule->category] = [
                        'action' => $rule->action,
                        'portfrom' => $rule->portfrom,
                        'portto' => $rule->portto,
                        'protocol' => $rule->protocol
                    ];
                }
                
                $items[] = $item;
            }
            
            // Apply pagination if requested
            $offset = isset($data['offset']) ? (int)$data['offset'] : 0;
            $limit = isset($data['limit']) ? (int)$data['limit'] : 0;
            
            $total = count($items);
            
            if ($limit > 0) {
                $items = array_slice($items, $offset, $limit);
            }
            
            $res->data = [
                'items' => $items,
                'total' => $total,
                'offset' => $offset,
                'limit' => $limit
            ];
            
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
}
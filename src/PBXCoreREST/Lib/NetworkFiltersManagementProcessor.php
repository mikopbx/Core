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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;
use Phalcon\Di\Di;

/**
 * Class NetworkFiltersManagementProcessor
 * 
 * Handles network filters management operations through REST API
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class NetworkFiltersManagementProcessor extends Injectable
{
    /**
     * Processes REST API network filters requests
     * 
     * @param array $request Request data
     * @return PBXApiResult API response
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'getForSelect':
                $res = self::getForSelect($data);
                break;
            case 'getNetworksForSelect':
                // For backward compatibility, returns all filters without category filtering
                $res = self::getForSelect(['categories' => ['SIP', 'IAX', 'AMI', 'API']]);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action";
        }
        
        $res->function = $action;
        return $res;
    }
    
    /**
     * Get network filters for dropdown select
     * 
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    private static function getForSelect(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $filters = [];
            
            // Get translation service
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            
            // Get categories
            $categories = $data['categories'] ?? ['SIP'];
            if (!is_array($categories)) {
                $categories = [$categories];
            }
            
            // Convert to uppercase to match FirewallRules constants (for SIP/IAX compatibility)
            $categories = array_map('strtoupper', $categories);
            
            // Use proper translation for "none" option
            $noneText = $translation->_('ex_NoNetworkFilter');
            
            // Add "none" option with proper translation and globe icon
            $filters[] = [
                'value' => 'none',
                'represent' => '<i class="globe icon"></i> ' . $noneText
            ];
            
            // Get filters that are allowed for specified categories
            $networkFilters = NetworkFilters::getAllowedFiltersForType($categories);
            
            // Keep track of added filters to avoid duplicates
            $addedFilterIds = [];
            
            foreach ($networkFilters as $filter) {
                // Skip if we already added this filter
                if (in_array($filter->id, $addedFilterIds)) {
                    continue;
                }
                
                // getRepresent() already includes the icon
                $filters[] = [
                    'value' => (string)$filter->id,
                    'represent' => $filter->getRepresent()
                ];
                
                // Mark this filter as added
                $addedFilterIds[] = $filter->id;
            }
            
            $res->success = true;
            $res->data = $filters;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get network filters: " . $e->getMessage(), LOG_ERR);
        }
        
        return $res;
    }
}
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
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * GetForSelectAction
 * 
 * Returns network filters formatted for dropdown select with category filtering
 * 
 * @package MikoPBX\PBXCoreREST\Lib\NetworkFilters
 */
class GetForSelectAction
{
    /**
     * Get network filters for dropdown select
     * 
     * @param array $data Request parameters:
     *   - categories: array of categories to filter by (e.g., ['SIP', 'IAX', 'AMI', 'API'])
     *   - includeLocalhost: bool - whether to include 127.0.0.1 option (useful for AMI)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
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
            
            // Check if we should include localhost option (for AMI scripts)
            $includeLocalhost = false;
            if (in_array('AMI', $categories) || in_array('API', $categories)) {
                $includeLocalhost = $data['includeLocalhost'] ?? false;
            }
            
            // Add "none" option with proper translation and globe icon
            $noneText = $translation->_('ex_NoNetworkFilter');
            $filters[] = [
                'value' => 'none',
                'represent' => '<i class="globe icon"></i> ' . $noneText,
                'name' => $noneText,
                'text' => $noneText
            ];
            
            // Add localhost option for AMI/API if requested
            if ($includeLocalhost) {
                $localhostText = $translation->_('fw_LocalhostOnly') ?? 'Local use only (127.0.0.1)';
                $filters[] = [
                    'value' => 'localhost',
                    'represent' => '<i class="home icon"></i> ' . $localhostText,
                    'name' => $localhostText,
                    'text' => $localhostText,
                    'description' => $translation->_('fw_LocalhostOnlyDescription') ?? 'Allows connections only from localhost. Use for internal scripts and applications.'
                ];
            }
            
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
                $represent = $filter->getRepresent();
                $filters[] = [
                    'value' => (string)$filter->id,
                    'represent' => $represent,
                    'name' => $filter->description,
                    'text' => $filter->description,
                    'network' => $filter->permit
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
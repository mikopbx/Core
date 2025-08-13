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
use MikoPBX\Common\Models\FirewallRules;
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
            case 'getNetworksForSelect':
                $res = self::getNetworksForSelect();
                break;
            case 'getForSelect':
                $res = self::getForSelect($data);
                break;
            case 'getAllowedForProviders':
                $res = self::getAllowedForProviders($data);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action";
        }
        
        $res->function = $action;
        return $res;
    }
    
    /**
     * Get all network filters for dropdown select (simplified)
     * 
     * @return PBXApiResult
     */
    private static function getNetworksForSelect(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $filters = [];
            
            // Get translation service
            $di = Di::getDefault();
            /** @var TranslationProvider $translation */
            $translation = $di->get('translation');
            
            // Add "none" option (allow connections from any address)  
            $filters[] = [
                'value' => 'none',
                'name' => $translation->_('ex_NoNetworkFilter'),
                'text' => $translation->_('ex_NoNetworkFilter')
            ];
            
            // Get all network filters from the system
            $networkFilters = NetworkFilters::find([
                'order' => 'id ASC'
            ]);
            
            foreach ($networkFilters as $filter) {
                $filters[] = [
                    'value' => (string)$filter->id,
                    'name' => $filter->getRepresent(),
                    'text' => $filter->getRepresent()
                ];
            }
            
            $res->success = true;
            $res->data = $filters;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get network filters for select: " . $e->getMessage(), LOG_ERR);
        }
        
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
            
            // Add "none" option
            $filters[] = [
                'value' => 'none',
                'name' => 'No network filter',
                'icon' => 'globe',
                'text' => 'No network filter'
            ];
            
            // Get allowed filters based on categories
            $categories = $data['categories'] ?? ['SIP'];
            
            if (!is_array($categories)) {
                $categories = [$categories];
            }
            
            // Get filters that are allowed for specified categories
            $networkFilters = NetworkFilters::getAllowedFiltersForType($categories);
            
            foreach ($networkFilters as $filter) {
                $filters[] = [
                    'value' => (string)$filter->id,
                    'name' => $filter->getRepresent(),
                    'icon' => 'filter',
                    'text' => $filter->getRepresent()
                ];
            }
            
            $res->success = true;
            $res->data = $filters;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get network filters: " . $e->getMessage(), LOG_ERR);
        }
        
        return $res;
    }
    
    /**
     * Get network filters allowed for providers (SIP/IAX)
     * 
     * @param array $data Request parameters with optional categories
     * @return PBXApiResult
     */
    private static function getAllowedForProviders(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $filters = [];
            
            // Get translation service
            $di = Di::getDefault();
            /** @var TranslationProvider $translation */
            $translation = $di->get('translation');
            
            // Add "none" option with proper translation
            $filters[] = [
                'value' => 'none',
                'name' => $translation->_('ex_NoNetworkFilter'),
                'icon' => 'globe',
                'text' => $translation->_('ex_NoNetworkFilter'),
                'selected' => false
            ];
            
            // Get categories from request or use default
            $categories = $data['categories'] ?? null;
            
            if (!empty($categories)) {
                // Ensure categories is an array
                if (!is_array($categories)) {
                    $categories = [$categories];
                }
                
                // Convert to uppercase to match FirewallRules constants
                $categories = array_map('strtoupper', $categories);
            } else {
                // Default to SIP for backward compatibility
                $categories = ['SIP'];
            }
            
            // Get filters allowed for specified categories
            $networkFilters = NetworkFilters::getAllowedFiltersForType($categories);
            
            // Keep track of already added filters to avoid duplicates
            $addedFilters = [];
            
            foreach ($networkFilters as $filter) {
                // Skip if already added
                if (isset($addedFilters[$filter->id])) {
                    continue;
                }
                
                $description = $filter->getRepresent();
                
                // Check if this is a local network filter
                $isLocal = $filter->local_network === '1';
                
                $filters[] = [
                    'value' => (string)$filter->id,
                    'name' => $description,
                    'icon' => $isLocal ? 'home' : 'filter',
                    'text' => $description,
                    'selected' => false,
                    'local' => $isLocal
                ];
                
                // Mark as added
                $addedFilters[$filter->id] = true;
            }
            
            $res->success = true;
            $res->data = $filters;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get provider network filters: " . $e->getMessage(), LOG_ERR);
        }
        
        return $res;
    }
}
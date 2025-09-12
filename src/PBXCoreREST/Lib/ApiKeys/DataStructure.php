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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for API keys
 * 
 * Provides consistent data format for API key records in REST API responses
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create data structure from model instance
     * 
     * @param ApiKeys $apiKey
     * @return array Full data structure
     */
    public static function createFromModel($apiKey): array
    {
        $data = [
            'id' => (string)$apiKey->id,
            'description' => $apiKey->description ?? '',
            'created_at' => $apiKey->created_at ?? '',
            'last_used_at' => $apiKey->last_used_at ?? '',
            'networkfilterid' => !empty($apiKey->networkfilterid) ? $apiKey->networkfilterid : 'none',
            'key_display' => $apiKey->key_display ?? '',
        ];
        
        // Decode allowed_paths JSON field
        if (!empty($apiKey->allowed_paths)) {
            $decoded = json_decode($apiKey->allowed_paths, true);
            $data['allowed_paths'] = is_array($decoded) ? $decoded : [];
        } else {
            $data['allowed_paths'] = [];
        }
        
        // Add computed fields
        $data['has_key'] = !empty($apiKey->key_hash);
        $data['allowed_paths_count'] = count($data['allowed_paths']);
        
        // Add network filter representation using unified helper
        $data['networkfilter_represent'] = self::getNetworkFilterRepresentation($apiKey->networkfilterid);
        $data['has_network_filter'] = !empty($apiKey->networkfilterid) && $apiKey->networkfilterid !== 'none';
        
        // Format boolean fields using parent method
        $data = self::formatBooleanFields($data, ['full_permissions']);
        $data['full_permissions'] = ($apiKey->full_permissions ?? '1') === '1';
        
        // Handle null values
        $data = self::handleNullValues($data);
        
        // Add representation
        if (method_exists($apiKey, 'getRepresent')) {
            $data['represent'] = $apiKey->getRepresent();
        }
        
        return $data;
    }
    
    /**
     * Create minimal data structure for list view
     * 
     * @param ApiKeys $apiKey
     * @return array Minimal data for list display
     */
    public static function createForList($apiKey): array
    {
        // Decode allowed_paths to count them
        $allowedPaths = [];
        if (!empty($apiKey->allowed_paths)) {
            $decoded = json_decode($apiKey->allowed_paths, true);
            if (is_array($decoded)) {
                $allowedPaths = $decoded;
            }
        }
        
        $data = [
            'id' => (string)$apiKey->id,
            'description' => $apiKey->description ?? '',
            'created_at' => $apiKey->created_at ?? '',
            'last_used_at' => $apiKey->last_used_at ?? '',
            'allowed_paths_count' => count($allowedPaths),
            'has_network_filter' => !empty($apiKey->networkfilterid) && $apiKey->networkfilterid !== 'none',
            'has_key' => !empty($apiKey->key_hash),
            'key_display' => $apiKey->key_display ?? '',
        ];
        
        // Format boolean field
        $data['full_permissions'] = ($apiKey->full_permissions ?? '1') === '1';
        
        // Add representation
        if (method_exists($apiKey, 'getRepresent')) {
            $data['represent'] = $apiKey->getRepresent();
        }
        
        return $data;
    }
    
    /**
     * Generate key display representation
     * 
     * @param string $key The full API key
     * @return string Display representation (first 5...last 5)
     */
    public static function generateKeyDisplay(string $key): string
    {
        if (strlen($key) <= 15) {
            return $key;
        }
        
        return substr($key, 0, 5) . '...' . substr($key, -5);
    }
}
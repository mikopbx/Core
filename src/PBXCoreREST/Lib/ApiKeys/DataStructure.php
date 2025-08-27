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

/**
 * Data structure for API keys
 * 
 * Provides consistent data format for API key records in REST API responses
 */
class DataStructure
{
    private array $data;
    
    /**
     * Constructor
     * 
     * @param array $data Raw data
     */
    public function __construct(array $data)
    {
        $this->data = $this->normalizeData($data);
    }
    
    /**
     * Create from model instance
     * 
     * @param ApiKeys $apiKey
     * @return self
     */
    public static function createFromModel(ApiKeys $apiKey): self
    {
        $data = $apiKey->toArray();
        
        // Decode JSON fields
        if (!empty($data['allowed_paths'])) {
            $decoded = json_decode($data['allowed_paths'], true);
            $data['allowed_paths'] = is_array($decoded) ? $decoded : [];
        } else {
            $data['allowed_paths'] = [];
        }
        
        // Remove sensitive data
        unset($data['key_hash']);
        
        // Add computed fields
        $data['has_key'] = !empty($apiKey->key_hash);
        
        // Convert full_permissions to boolean
        $data['full_permissions'] = ($data['full_permissions'] ?? '1') === '1';
        
        return new self($data);
    }
    
    /**
     * Create for list view (minimal data)
     * 
     * @param ApiKeys $apiKey
     * @return array
     */
    public static function createForList(ApiKeys $apiKey): array
    {
        // Handle allowed_paths which could be empty string, null, or JSON
        $allowedPaths = [];
        if (!empty($apiKey->allowed_paths)) {
            $decoded = json_decode($apiKey->allowed_paths, true);
            if (is_array($decoded)) {
                $allowedPaths = $decoded;
            }
        }
        
        return [
            'id' => $apiKey->id,
            'description' => $apiKey->description,
            'created_at' => $apiKey->created_at,
            'last_used_at' => $apiKey->last_used_at,
            'full_permissions' => ($apiKey->full_permissions ?? '1') === '1',
            'allowed_paths_count' => count($allowedPaths),
            'has_network_filter' => !empty($apiKey->networkfilterid) && $apiKey->networkfilterid !== 'none',
            'has_key' => !empty($apiKey->key_hash),
            'key_display' => $apiKey->key_display ?? '',
            'represent' => $apiKey->getRepresent(),
        ];
    }
    
    /**
     * Normalize data structure
     * 
     * @param array $data
     * @return array
     */
    private function normalizeData(array $data): array
    {
        $normalized = [
            'id' => $data['id'] ?? null,
            'description' => $data['description'] ?? '',
            'allowed_paths' => $data['allowed_paths'] ?? [],
            'networkfilterid' => $data['networkfilterid'] ?? null,
            'full_permissions' => $data['full_permissions'] ?? true,
            'created_at' => $data['created_at'] ?? null,
            'last_used_at' => $data['last_used_at'] ?? null,
            'has_key' => $data['has_key'] ?? false,
            'key_display' => $data['key_display'] ?? '',
        ];
        
        // Ensure allowed_paths is array
        if (!is_array($normalized['allowed_paths'])) {
            $normalized['allowed_paths'] = [];
        }
        
        // Convert full_permissions string to boolean
        if (is_string($normalized['full_permissions'])) {
            $normalized['full_permissions'] = $normalized['full_permissions'] === '1';
        }
        
        return $normalized;
    }
    
    /**
     * Convert to array
     * 
     * @return array
     */
    public function toArray(): array
    {
        return $this->data;
    }
}
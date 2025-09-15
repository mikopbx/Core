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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Dialplan Applications
 * 
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from DialplanApplications model
     * 
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Use uniqid as id for REST API v3
        $data = [
            'id' => $model->uniqid,
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'description' => $model->description ?? '',
            'hint' => $model->hint ?? '',
            'applicationlogic' => $model->getApplicationlogic(), // Decoded logic for editing
            'type' => $model->type ?? 'php'
        ];
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['hint', 'description']);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * 
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array
     */
    public static function createForList($model): array
    {
        // Use uniqid as id for REST API v3
        $data = [
            'id' => $model->uniqid,
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'description' => $model->description ?? '',
            'type' => $model->type ?? 'php',
            'hint' => $model->hint ?? ''
        ];
        
        // Add represent field for dropdown display
        if (method_exists($model, 'getRepresent')) {
            $data['represent'] = $model->getRepresent();
        }
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['hint', 'description']);
        
        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options
     * 
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => $model->uniqid, // Use uniqid as id for REST API v3
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'represent' => method_exists($model, 'getRepresent') ? $model->getRepresent() : ($model->name ?? '')
        ];
    }
}
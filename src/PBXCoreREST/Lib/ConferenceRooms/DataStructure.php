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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for conference rooms
 * 
 * Extends AbstractDataStructure to leverage common functionality:
 * - Boolean field formatting
 * - Extension representation helpers
 * - Text field processing
 * 
 * @package MikoPBX\PBXCoreREST\Lib\ConferenceRooms
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create full data array from ConferenceRooms model
     * 
     * Used for detailed views and single record retrieval.
     * Uses uniqid as the primary identifier for clean API design.
     * 
     * @param ConferenceRooms $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => $model->uniqid,
            'extension' => $model->extension,
            'name' => $model->name,
            'pinCode' => $model->pinCode ?? '',
            'represent' => $model->getRepresent()
        ];
    }
    
    /**
     * Create optimized data array for list view
     * 
     * Returns data needed for list display.
     * Uses uniqid as the primary identifier for clean API design.
     * 
     * @param ConferenceRooms $model
     * @return array
     */
    public static function createForList($model): array
    {
        return [
            'id' => $model->uniqid,
            'extension' => $model->extension,
            'name' => $model->name,
            'pinCode' => $model->pinCode ?? '',
            'represent' => $model->getRepresent()
        ];
    }
}
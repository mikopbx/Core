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

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for sound files
 * 
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from SoundFiles model
     * @param mixed $model SoundFiles model instance
     * @return array
     */
    public static function createFromModel($model): array
    {
        // SoundFiles doesn't have uniqid/extension fields, so we create structure manually
        $data = [
            'id' => (string)$model->id,
            'name' => $model->name ?? '',
            'description' => $model->description ?? ''
        ];
        
        // Add SoundFiles specific fields
        $data['path'] = $model->path ?? '';
        $data['category'] = $model->category ?? SoundFiles::CATEGORY_CUSTOM;
        $data['fileSize'] = file_exists($model->path) ? filesize($model->path) : 0;
        $data['duration'] = self::getAudioDuration($model->path);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * @param mixed $model
     * @return array
     */
    public static function createForList($model): array
    {
        // For list view, include all data (sound files don't have heavy relations)
        return self::createFromModel($model);
    }
    
    /**
     * Get audio file duration using sox
     * @param string $path Path to audio file
     * @return string Duration in MM:SS format
     */
    private static function getAudioDuration(string $path): string
    {
        if (!file_exists($path)) {
            return '00:00';
        }
        
        // Use sox to get duration
        $output = [];
        $result = Processes::mwExec("soxi -D '$path' 2>/dev/null", $output);
        
        if ($result === 0 && !empty($output[0])) {
            $seconds = round((float)trim($output[0]));
            $minutes = floor($seconds / 60);
            $seconds = $seconds % 60;
            return sprintf('%02d:%02d', $minutes, $seconds);
        }
        
        return '00:00';
    }
}
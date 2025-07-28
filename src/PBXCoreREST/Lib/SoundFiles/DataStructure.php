<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;

/**
 * Data structure for sound files
 * 
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class DataStructure
{
    /**
     * Create data array from SoundFiles model
     * @param SoundFiles $model
     * @return array
     */
    public static function createFromModel(SoundFiles $model): array
    {
        return [
            'id' => (string)$model->id,
            'name' => $model->name,
            'path' => $model->path,
            'category' => $model->category,
            'description' => $model->description ?? '',
            'fileSize' => file_exists($model->path) ? filesize($model->path) : 0,
            'duration' => self::getAudioDuration($model->path)
        ];
    }
    
    /**
     * Get audio file duration
     * @param string $path
     * @return string
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
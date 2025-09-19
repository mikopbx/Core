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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;

/**
 * Data structure for custom files
 *
 * Creates consistent data format for API responses.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class DataStructure
{
    /**
     * Create data array from CustomFiles model
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param CustomFiles $model Custom file model instance
     * @return array Complete data structure
     */
    public static function createFromModel(CustomFiles $model): array
    {
        return [
            'id' => $model->id,
            'filepath' => $model->filepath ?? '',
            'content' => $model->content ?? '', // Already base64 encoded in DB
            'mode' => $model->mode ?? CustomFiles::MODE_NONE,
            'description' => $model->description ?? '',
            'changed' => $model->changed ?? '0'
        ];
    }
}
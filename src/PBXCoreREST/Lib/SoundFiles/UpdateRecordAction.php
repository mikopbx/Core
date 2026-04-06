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

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for full update of sound file record
 *
 * Replaces entire sound file record with new data
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class UpdateRecordAction
{
    /**
     * Full update of sound file record
     *
     * @param array $data Complete sound file data including ID
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Validate ID is present for update
        if (empty($data['id'])) {
            $res->messages['error'][] = 'Record ID is required for update';
            return $res;
        }

        // Mark this as an UPDATE operation via PUT method
        $data['httpMethod'] = 'PUT';

        // Delegate to SaveRecordAction for full update
        return SaveRecordAction::main($data);
    }
}
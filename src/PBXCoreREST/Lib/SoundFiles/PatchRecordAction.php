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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for partial update of sound file record
 *
 * Updates only specified fields in sound file record
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class PatchRecordAction
{
    /**
     * Partial update of sound file record
     *
     * @param array $data Partial sound file data including ID
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Validate ID is present for patch
        if (empty($data['id'])) {
            $res->messages['error'][] = 'Record ID is required for patch';
            return $res;
        }

        // Get existing record
        $record = SoundFiles::findFirstById($data['id']);
        if (!$record) {
            $res->messages['error'][] = 'api_SoundFileNotFound';
            return $res;
        }

        // Merge existing data with patch data
        $existingData = $record->toArray();
        $mergedData = array_merge($existingData, $data);

        // Delegate to SaveRecordAction with merged data
        return SaveRecordAction::main($mergedData);
    }
}
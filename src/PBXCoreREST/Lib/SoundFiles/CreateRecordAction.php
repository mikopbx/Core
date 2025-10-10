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

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * CreateRecordAction
 * Creates a new sound file record.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class CreateRecordAction
{
    /**
     * Create a new sound file record.
     *
     * @param array<string, mixed> $data Sound file data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Note: SoundFiles uses a special httpMethod flag to distinguish CREATE vs UPDATE
        // This is maintained for backward compatibility with existing SaveRecordAction logic

        try {
            // Mark this as a CREATE operation via POST method
            // ID is allowed for pre-generated IDs (like when copying records)
            $data['httpMethod'] = 'POST';

            // Use existing SaveRecordAction logic for actual save
            $res = SaveRecordAction::main($data);

            // If successful, log the creation event
            if ($res->success && isset($res->data['id'])) {
                SystemMessages::sysLogMsg(__CLASS__, 'New sound file created: ' . $res->data['id'], LOG_INFO);
            }

            return $res;

        } catch (\Exception $e) {
            $res = new PBXApiResult();
            $res->processor = __METHOD__;
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }
    }
}
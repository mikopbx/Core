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
 * Action for getting default sound file structure
 *
 * Returns empty structure for new sound file creation
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class GetDefaultAction
{
    /**
     * Get default sound file structure
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        // Delegate to GetRecordAction with null ID for default structure
        return GetRecordAction::main(null);
    }
}
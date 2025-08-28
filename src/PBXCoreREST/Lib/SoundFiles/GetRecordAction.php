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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting sound file record
 * 
 * @api {get} /pbxcore/api/v2/sound-files/getRecord/:id Get sound file record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Sound file data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.name File name
 * @apiSuccess {String} data.path File path
 * @apiSuccess {String} data.category File category
 * @apiSuccess {String} data.description File description
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get sound file record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        return self::executeStandardGetRecord(
            $id,
            SoundFiles::class,
            DataStructure::class,
            'SOUND-', // Note: SoundFiles doesn't use uniqid, but this is for consistency
            [
                'category' => SoundFiles::CATEGORY_CUSTOM,
                'path' => ''
            ],
            'Sound file not found',
            false // SoundFiles don't need extensions
        );
    }
}
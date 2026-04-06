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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting sound file record
 * 
 * @api {delete} /pbxcore/api/v2/sound-files/deleteRecord/:id Delete sound file
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete sound file record
     * 
     * @param string $id - Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        return self::executeStandardDelete(
            SoundFiles::class,
            $id,
            'Sound file',
            'api_SoundFileNotFound',
            null // No additional cleanup needed - SoundFiles model handles file deletion
        );
    }
}
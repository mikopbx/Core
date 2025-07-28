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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

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
class GetRecordAction
{
    /**
     * Get sound file record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newFile = new SoundFiles();
            $newFile->id = '';
            $newFile->name = '';
            $newFile->path = '';
            $newFile->category = SoundFiles::CATEGORY_CUSTOM;
            $newFile->description = '';
            
            $res->data = DataStructure::createFromModel($newFile);
            $res->success = true;
        } else {
            // Find existing record
            $file = SoundFiles::findFirstById($id);
            
            if ($file) {
                $res->data = DataStructure::createFromModel($file);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Sound file not found';
            }
        }
        
        return $res;
    }
}
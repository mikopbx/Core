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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

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
class DeleteRecordAction
{
    /**
     * Delete sound file record
     * 
     * @param string $id - Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            return $res;
        }
        
        try {
            // Find record
            $file = SoundFiles::findFirstById($id);
            
            if (!$file) {
                $res->messages['error'][] = 'api_SoundFileNotFound';
                return $res;
            }
            
            // Try to delete - the model will check integrity constraints
            if ($file->delete()) {
                // Success - file and record deleted
                $res->success = true;
                $res->data = ['deleted_id' => $id];
            } else {
                // Failed - get detailed error messages from model
                $messages = $file->getMessages();
                foreach ($messages as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
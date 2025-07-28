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
use MikoPBX\PBXCoreREST\Lib\Files\UploadFileAction as FilesUploadFileAction;

/**
 * Action for uploading sound file
 * 
 * @api {post} /pbxcore/api/v2/sound-files/uploadFile Upload sound file
 * @apiVersion 2.0.0
 * @apiName UploadFile
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} file_id Resumable file identifier
 * @apiParam {String} [category] File category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Upload result
 * @apiSuccess {String} data.file_id File identifier
 * @apiSuccess {String} data.file_path Path to uploaded file
 * @apiSuccess {String} data.uploaded_size Uploaded file size
 */
class UploadFileAction
{
    /**
     * Upload sound file using Resumable.js
     * 
     * @param array $data - Upload data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Use the existing Files upload mechanism
        $category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
        
        // Call the existing upload action
        $uploadResult = FilesUploadFileAction::main($data);
        
        if ($uploadResult->success && !empty($uploadResult->data['upload_file_path'])) {
            // Create or update sound file record
            $filePath = $uploadResult->data['upload_file_path'];
            
            $soundFile = SoundFiles::findFirst([
                'conditions' => 'path = :path:',
                'bind' => ['path' => $filePath]
            ]);
            
            if (!$soundFile) {
                $soundFile = new SoundFiles();
                $soundFile->path = $filePath;
                $soundFile->category = $category;
            }
            
            // Extract filename without extension
            $filename = pathinfo($filePath, PATHINFO_FILENAME);
            $soundFile->name = $filename;
            
            if ($soundFile->save()) {
                $uploadResult->data['sound_file_id'] = $soundFile->id;
            } else {
                $uploadResult->success = false;
                $uploadResult->messages['error'] = $soundFile->getMessages();
            }
        }
        
        return $uploadResult;
    }
}
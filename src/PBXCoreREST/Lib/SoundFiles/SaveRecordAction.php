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
 * Action for saving sound file record
 * 
 * @api {post} /pbxcore/api/v2/sound-files/saveRecord Create sound file
 * @api {put} /pbxcore/api/v2/sound-files/saveRecord/:id Update sound file
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name File name/description
 * @apiParam {String} [description] File description
 * @apiParam {String} [category] File category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved sound file data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save sound file record
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Data sanitization
        $sanitizationRules = [
            'id' => 'int',
            'name' => 'string|html_escape|max:255',
            'description' => 'string|html_escape|max:1000|empty_to_null',
            'category' => 'string|max:50',
            'path' => 'string|max:500'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Sound file name is required']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $file = SoundFiles::findFirstById($data['id']);
            if (!$file) {
                $res->messages['error'][] = 'api_SoundFileNotFound';
                return $res;
            }
        } else {
            $file = new SoundFiles();
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedFile = BaseActionHelper::executeInTransaction(function() use ($file, $data) {
                // Update model fields
                $file->name = $data['name'];
                $file->description = $data['description'] ?? '';
                
                // Set category only for new files or if explicitly provided
                if (empty($file->id) || !empty($data['category'])) {
                    $file->category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
                }
                
                // Update path if provided
                if (!empty($data['path'])) {
                    $file->path = $data['path'];
                }
                
                if (!$file->save()) {
                    throw new \Exception(implode(', ', $file->getMessages()));
                }
                
                return $file;
            });
            
            $res->data = DataStructure::createFromModel($savedFile);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "sound-files/modify/{$savedFile->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
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
 * Action for getting list of all sound files
 * 
 * @api {get} /pbxcore/api/v2/sound-files/getList Get all sound files
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [category] Filter by category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of sound files
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.name File name
 * @apiSuccess {String} data.path File path
 * @apiSuccess {String} data.category File category
 * @apiSuccess {String} data.description File description
 */
class GetListAction
{
    /**
     * Get list of all sound files
     * 
     * @param array $data - Filter parameters
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Build query conditions
            $parameters = [
                'order' => 'name ASC'
            ];
            
            // Add category filter if provided
            if (!empty($data['category'])) {
                $parameters['conditions'] = 'category = :category:';
                $parameters['bind'] = ['category' => $data['category']];
            }
            
            // Get sound files
            $files = SoundFiles::find($parameters);
            
            $result = [];
            foreach ($files as $file) {
                $result[] = DataStructure::createFromModel($file);
            }
            
            $res->data = $result;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
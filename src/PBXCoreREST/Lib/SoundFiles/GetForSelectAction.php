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
 * Action for getting sound files list formatted for dropdown selects
 *
 * @api {get} /pbxcore/api/v2/sound-files/getForSelect Get sound files for select dropdown
 * @apiVersion 2.0.0
 * @apiName GetForSelect
 * @apiGroup SoundFiles
 *
 * @apiParam {String} [category=custom] Category filter (custom/moh)
 * @apiParam {Boolean} [includeEmpty=false] Include empty option at the beginning
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of sound files
 * @apiSuccess {String} data.value File ID (for dropdown value)
 * @apiSuccess {String} data.id File ID
 * @apiSuccess {String} data.category File category (custom/moh)
 * @apiSuccess {String} data.path File path
 * @apiSuccess {String} data.represent Display name with HTML formatting
 */
class GetForSelectAction
{
    /**
     * Get sound files list for dropdown select
     *
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
            $includeEmpty = filter_var($data['includeEmpty'] ?? false, FILTER_VALIDATE_BOOLEAN);

            // Validate category
            if (!in_array($category, [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH], true)) {
                $category = SoundFiles::CATEGORY_CUSTOM;
            }

            // Get files by category
            $soundFiles = SoundFiles::find([
                'conditions' => 'category = :category:',
                'bind' => ['category' => $category]
            ]);

            $soundFilesList = [];

            // Add empty option if requested
            if ($includeEmpty) {
                $soundFilesList[] = [
                    'value' => -1,
                    'id' => -1,
                    'category' => '',
                    'path' => '',
                    'represent' => '-'
                ];
            }

            foreach ($soundFiles as $soundFile) {
                $soundFilesList[] = [
                    'value' => $soundFile->id,
                    'id' => $soundFile->id,
                    'category' => $soundFile->category,
                    'path' => $soundFile->path,
                    'represent' => $soundFile->getRepresent()
                ];
            }

            $res->data = $soundFilesList;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
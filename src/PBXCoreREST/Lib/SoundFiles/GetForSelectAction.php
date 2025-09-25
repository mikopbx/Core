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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetForSelectAction;

/**
 * Action for getting sound files list formatted for dropdown selects
 *
 * Extends AbstractGetForSelectAction to leverage:
 * - Standard select data formatting
 * - Category filtering
 * - Empty option support
 * - Consistent error handling
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
 * @apiSuccess {String} data.text Display name with HTML formatting
 * @apiSuccess {String} data.name Same as text
 * @apiSuccess {String} data.id File ID
 * @apiSuccess {String} data.category File category (custom/moh)
 * @apiSuccess {String} data.path File path
 */
class GetForSelectAction extends AbstractGetForSelectAction
{
    /**
     * Get sound files list for dropdown select
     *
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Validate and set default category
        $category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
        if (!in_array($category, [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH], true)) {
            $data['category'] = SoundFiles::CATEGORY_CUSTOM;
        }

        return self::executeStandardGetForSelect(
            SoundFiles::class,
            $data,
            'getRepresent',       // Use getRepresent() method for display
            ['category'],         // Allow filtering by category
            'name ASC',           // Order by name
            'id',                 // Use id as value
            ['category', 'path'], // Include category and path in response
            self::createSoundFileTransform()  // Custom transform for sound files
        );
    }

    /**
     * Create custom transform function for sound files
     *
     * @return callable
     */
    private static function createSoundFileTransform(): callable
    {
        return function ($soundFile) {
            $represent = $soundFile->getRepresent();

            return [
                'value' => $soundFile->id,
                'text' => $represent,
                'name' => $represent,
                'id' => $soundFile->id,
                'category' => $soundFile->category,
                'path' => $soundFile->path,
                'represent' => $represent  // Keep for backward compatibility
            ];
        };
    }
}
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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting default values for a new custom file
 *
 * This action is used when creating a new custom file to provide
 * default values for form initialization
 *
 * @api {get} /pbxcore/api/v3/custom-files:getDefault Get default values for new custom file
 * @apiVersion 3.0.0
 * @apiName GetDefault
 * @apiGroup CustomFiles
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default custom file data
 * @apiSuccess {String} data.filepath Empty filepath for user input
 * @apiSuccess {String} data.content Empty content (base64 encoded empty string)
 * @apiSuccess {String} data.mode Default mode (none)
 * @apiSuccess {String} data.description Empty description
 * @apiSuccess {String} data.changed Default "0"
 * @apiSuccess {String} data.isNew Always "1" for new records
 */
class GetDefaultAction
{
    /**
     * Get default values for a new custom file
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Create default structure for new custom file
            $data = [
                'id' => '',  // Will be assigned on save
                'filepath' => '',
                'content' => base64_encode(''),  // Empty content, base64 encoded
                'mode' => CustomFiles::MODE_CUSTOM,  // New files are always custom mode
                'description' => '',
                'changed' => '0',
                'isNew' => '1'
            ];

            $res->data = $data;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
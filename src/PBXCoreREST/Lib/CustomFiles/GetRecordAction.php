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
 * Action for getting a single custom file by ID
 *
 * @api {get} /pbxcore/api/v3/custom-files/:id Get custom file by ID
 * @apiVersion 3.0.0
 * @apiName GetRecord
 * @apiGroup CustomFiles
 *
 * @apiParam {String} id Custom file ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Custom file data
 * @apiSuccess {String} data.id File ID
 * @apiSuccess {String} data.filepath File path
 * @apiSuccess {String} data.content File content (base64 encoded)
 * @apiSuccess {String} data.mode File mode (none, append, override, script)
 * @apiSuccess {String} data.description File description
 * @apiSuccess {String} data.changed Changed flag
 */
class GetRecordAction
{
    /**
     * Get custom file by ID
     *
     * @param string $id Custom file ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            if (empty($id)) {
                $res->messages['error'][] = 'ID is required';
                return $res;
            }

            $file = CustomFiles::findFirstById($id);
            if (!$file) {
                $res->messages['error'][] = "Custom file with ID '$id' not found";
                return $res;
            }

            $res->data = DataStructure::createFromModel($file);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
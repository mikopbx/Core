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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting a single custom file by ID
 *
 * Extends AbstractGetRecordAction to leverage:
 * - Standard record retrieval patterns
 * - Automatic new record structure creation
 * - Consistent error handling
 *
 * @api {get} /pbxcore/api/v3/custom-files/:id Get custom file by ID
 * @apiVersion 3.0.0
 * @apiName GetRecord
 * @apiGroup CustomFiles
 *
 * @apiParam {String} id Custom file ID or "new" for new record structure
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
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get custom file by ID or create new structure
     *
     * @param string|null $id Custom file ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        // CustomFiles don't have uniqid and don't need extensions
        // So we need custom implementation
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            if (empty($id) || $id === 'new') {
                // Create structure for new record - new files are always custom mode
                $model = new CustomFiles();
                $model->id = '';
                $model->filepath = '';
                $model->content = '';
                $model->mode = CustomFiles::MODE_CUSTOM;  // New files are user-created custom files
                $model->description = '';
                $model->changed = '0';

                $res->data = DataStructure::createFromModel($model);
                $res->success = true;
            } else {
                // Find existing record
                $record = CustomFiles::findFirstById($id);

                if ($record) {
                    $res->data = DataStructure::createFromModel($record);
                    $res->success = true;
                } else {
                    $res->messages['error'][] = 'Custom file not found';
                }
            }
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
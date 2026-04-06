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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting a custom file
 *
 * Extends AbstractDeleteAction to leverage:
 * - Standard record lookup
 * - Transaction-based deletion
 * - Consistent error handling and logging
 *
 * @api {delete} /pbxcore/api/v3/custom-files/:id Delete custom file
 * @apiVersion 3.0.0
 * @apiName DeleteRecord
 * @apiGroup CustomFiles
 *
 * @apiParam {String} id Custom file ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deleted file information
 * @apiSuccess {String} data.deleted_id Deleted file ID
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete custom file by ID
     *
     * @param string $id Custom file ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        // CustomFiles don't have extensions or related records
        // Use simplified delete pattern
        return self::executeStandardDelete(
            CustomFiles::class,
            $id,
            'Custom file',
            'Custom file not found',
            null  // No additional cleanup needed
        );
    }
}
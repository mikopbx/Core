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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of custom files
 *
 * Extends AbstractGetListAction to leverage:
 * - Standard list retrieval patterns
 * - Search functionality
 * - Ordering support
 * - Pagination support
 * - Consistent error handling
 *
 * @api {get} /pbxcore/api/v3/custom-files Get list of custom files
 * @apiVersion 3.0.0
 * @apiName GetList
 * @apiGroup CustomFiles
 *
 * @apiParam {Number} [limit=50] Number of records to return
 * @apiParam {Number} [offset=0] Offset for pagination
 * @apiParam {String} [search] Search string for filtering
 * @apiParam {String} [order] Sort field (filepath, mode, changed)
 * @apiParam {String} [orderWay=ASC] Sort order (ASC or DESC)
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of custom files
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of custom files with optional filtering and pagination
     *
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Use standard list execution from parent class
        return self::executeStandardList(
            CustomFiles::class,
            DataStructure::class,
            $data,
            [],                                      // Base query options
            false,                                   // Use createForList() for better performance
            ['filepath', 'mode', 'changed', 'id'],  // Allowed order fields
            ['filepath', 'description'],            // Searchable fields
            null,                                    // No record filter
            'filepath ASC'                          // Default order
        );
    }
}
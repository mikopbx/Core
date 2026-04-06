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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all conference rooms
 * 
 * Extends AbstractGetListAction to leverage:
 * - Standard list retrieval patterns
 * - Search functionality
 * - Ordering support
 * - Pagination support
 * - Consistent error handling
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getList Get all conference rooms
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [search] Search term for filtering by name
 * @apiParam {String} [order] Field to order by (name, extension, id)
 * @apiParam {String} [orderWay] Order direction (ASC/DESC)
 * @apiParam {Number} [limit] Maximum number of records to return
 * @apiParam {Number} [offset] Number of records to skip
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of conference rooms
 * @apiSuccess {String} data.id Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 * @apiSuccess {String} data.represent Display representation of conference room (name + extension)
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all conference rooms with filtering and pagination support
     * 
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Use standard list execution from parent class
        return self::executeStandardList(
            ConferenceRooms::class,
            DataStructure::class,
            $data,                              // Request parameters
            [],                                 // Base query options
            false,                              // Use createForList() for better performance
            ['name', 'extension', 'id'],       // Allowed order fields
            ['name'],                           // Searchable fields
            null,                               // No record filter
            'name ASC'                          // Default order
        );
    }
}
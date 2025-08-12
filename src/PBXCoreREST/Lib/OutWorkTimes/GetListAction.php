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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for retrieving list of out-of-work-time conditions
 * 
 * Extends AbstractGetListAction to leverage standardized list retrieval patterns.
 * Returns list of time conditions with optimized data structure for UI display.
 * 
 * @api {get} /pbxcore/api/v2/out-work-times/getList Get time conditions list
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup OutWorkTimes
 * 
 * @apiParam {String} [search] Search term for filtering
 * @apiParam {String} [order_by] Field to order by (name, priority)
 * @apiParam {String} [order_direction] Order direction (ASC, DESC)
 * @apiParam {Number} [limit] Number of records to return
 * @apiParam {Number} [offset] Number of records to skip
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Array} data List of time conditions
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.name Time condition name
 * @apiSuccess {String} data.description Description
 * @apiSuccess {String} data.calType Calendar type
 * @apiSuccess {Object} data.routing Routing configuration
 * @apiSuccess {Boolean} data.enabled Status
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of out-of-work-time conditions
     * 
     * @param array $data Request data (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Use executeStandardList from abstract class
        return self::executeStandardList(
            modelClass: OutWorkTimes::class,
            dataStructureClass: DataStructure::class,
            requestParams: $data,
            baseQueryOptions: [],
            useFullData: false, // Use createForList for performance
            allowedOrderFields: ['name', 'priority', 'id'],
            searchableFields: ['name', 'description'],
            recordFilter: null,
            defaultOrder: 'priority ASC'
        );
    }
}
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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all API key records
 * 
 * @api {get} /pbxcore/api/v2/api-keys/getList Get all API key records
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup ApiKeys
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of API key records
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all API keys with formatted data
     * 
     * @param array $data Filter parameters (supports search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Use standard list execution from parent class
        return self::executeStandardList(
            ApiKeys::class,
            DataStructure::class,
            $data,                              // Request parameters
            [],                                 // Base query options
            false,                              // Use createForList() for better performance
            ['description', 'id'],              // Allowed order fields
            ['description', 'key_display'],     // Searchable fields
            null,                               // No record filter
            'description ASC, id DESC'          // Default order
        );
    }
}
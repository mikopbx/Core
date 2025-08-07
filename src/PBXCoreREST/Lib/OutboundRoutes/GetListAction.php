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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all outbound routes
 * 
 * @api {get} /pbxcore/api/v2/outbound-routes/getList Get all outbound routes
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup OutboundRoutes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of outbound routes with provider details
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all outbound routes with provider data
     * 
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Override default ordering to use priority
        if (!isset($data['order'])) {
            $data['order'] = 'priority';
            $data['orderWay'] = 'asc';
        }
        
        return self::executeStandardList(
            OutgoingRoutingTable::class,       // Model class
            DataStructure::class,              // DataStructure class
            $data,                             // Request parameters
            [],                                // Base query options - no exclusions
            false,                             // Use createForList() for better performance
            ['priority', 'rulename', 'numberbeginswith'], // Allowed order fields
            ['rulename', 'numberbeginswith', 'note', 'prepend'] // Searchable fields
        );
    }
}
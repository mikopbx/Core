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
        // priority has TEXT affinity, so a plain "ORDER BY priority" sorts
        // lexicographically ("10" before "2") and scrambles 10+ routes (#1076).
        // Map any priority sort (the default, or an explicit request) to a numeric
        // CAST while still honouring the requested direction.
        // Capture order_by/direction BEFORE the unset() below — they must be read
        // first so an explicit priority sort with order_direction=DESC is honoured.
        $orderBy = $data['order_by'] ?? $data['order'] ?? 'priority';
        $direction = strtoupper((string)($data['order_direction'] ?? $data['orderWay'] ?? 'ASC')) === 'DESC'
            ? 'DESC'
            : 'ASC';

        $defaultOrder = 'CAST(priority AS INTEGER) ASC';
        if ($orderBy === '' || $orderBy === 'priority') {
            // Numeric priority sort honouring the requested direction. Drop the raw
            // order keys so applyOrdering falls through to this numeric default.
            $defaultOrder = 'CAST(priority AS INTEGER) ' . $direction;
            unset($data['order'], $data['order_by'], $data['orderWay'], $data['order_direction']);
        }

        return self::executeStandardList(
            OutgoingRoutingTable::class,       // Model class
            DataStructure::class,              // DataStructure class
            $data,                             // Request parameters
            [],                                // Base query options - no exclusions
            false,                             // Use createForList() for better performance
            ['rulename', 'numberbeginswith'],  // Allowed order fields (priority handled numerically)
            ['rulename', 'numberbeginswith', 'note', 'prepend'], // Searchable fields
            null,                              // No record filter
            $defaultOrder                      // Numeric priority sort (CAST), honours direction
        );
    }
}

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

/**
 * Action for deleting outbound route (v3 RESTful API)
 * 
 * @api {delete} /pbxcore/api/v3/outbound-routes/:id Delete outbound route
 * @apiVersion 3.0.0
 * @apiName Delete
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} id Route ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Empty object on success
 */
class DeleteAction
{
    /**
     * Delete outbound route (v3 RESTful version)
     * 
     * @param string $id Route ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        // Use existing DeleteRecordAction for consistency
        return DeleteRecordAction::main($id);
    }
}
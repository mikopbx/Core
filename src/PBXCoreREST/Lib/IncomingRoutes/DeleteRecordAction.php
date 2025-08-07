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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for deleting incoming route record
 * 
 * @api {delete} /pbxcore/api/v2/incoming-routes/deleteRecord/:id Delete incoming route
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete incoming route record
     * 
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Validate input
        if (empty($id)) {
            $res->messages['error'][] = 'Empty ID in request data';
            return $res;
        }
        
        // Prevent deletion of default route
        if ((int)$id === 1) {
            $res->messages['error'][] = 'Cannot delete default incoming route';
            return $res;
        }
        
        // Find and delete the route
        // Note: IncomingRoutingTable has belongsTo relation with Extension 
        // with NO_ACTION, so Extensions should NOT be deleted
        $route = IncomingRoutingTable::findFirstById($id);
        
        if (!$route) {
            $res->messages['error'][] = 'api_IncomingRouteNotFound';
            return $res;
        }
        
        // Simply delete the route record without touching extensions
        // Extensions can be shared between multiple routes
        if ($route->delete()) {
            $res->success = true;
            $res->data = ['deleted_id' => $id];
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Incoming route '{$route->rulename}' (ID: {$id}) deleted successfully",
                LOG_INFO
            );
        } else {
            $res->messages['error'] = $route->getMessages();
        }
        
        return $res;
    }
}
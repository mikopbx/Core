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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting/creating default incoming route (ID=1)
 *
 * @api {get} /pbxcore/api/v3/incoming-routes:getDefaultRoute Get default incoming route
 * @apiVersion 3.0.0
 * @apiName GetDefaultRoute
 * @apiGroup IncomingRoutes
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default route data
 */
class GetDefaultRouteAction
{
    /**
     * Get or create default incoming route (ID=1)
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find default route by ID=1
            $defaultRule = IncomingRoutingTable::findFirstById(1);

            if ($defaultRule === null) {
                // Create default route if it doesn't exist
                $defaultRule = new IncomingRoutingTable();
                $defaultRule->id = 1;
                $defaultRule->action = IncomingRoutingTable::ACTION_EXTENSION;
                $defaultRule->extension = 'busy';
                $defaultRule->priority = 9999;
                $defaultRule->rulename = 'default action';
                $defaultRule->number = '';
                $defaultRule->provider = null;
                $defaultRule->timeout = 0;
                $defaultRule->audio_message_id = null;
                $defaultRule->note = '';

                if (!$defaultRule->save()) {
                    throw new \Exception('Failed to create default route: ' . implode(', ', $defaultRule->getMessages()));
                }
            }

            // Convert to data structure
            $res->data = DataStructure::createFromModel($defaultRule);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
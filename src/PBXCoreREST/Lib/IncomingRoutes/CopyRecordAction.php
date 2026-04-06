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
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying an incoming route
 *
 * This action creates a copy of an existing incoming route with:
 * - New unique ID generated automatically
 * - Priority set to the next available position
 * - All settings copied from source
 *
 * @api {get} /pbxcore/api/v3/incoming-routes/{id}:copy Copy incoming route
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup IncomingRoutes
 *
 * @apiParam {String} id Source incoming route ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied incoming route data ready for creation
 * @apiSuccess {String} data.id New unique identifier
 * @apiSuccess {Number} data.priority New priority (automatically assigned)
 * @apiSuccess {String} data.provider Provider ID from source
 * @apiSuccess {String} data.number Number pattern from source
 */
class CopyRecordAction
{
    /**
     * Copy incoming route record with new ID and priority
     *
     * @param string $sourceId Source incoming route ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source incoming route
            $sourceRoute = IncomingRoutingTable::findFirst("id='{$sourceId}'");

            if (!$sourceRoute) {
                $res->messages['error'][] = "Source incoming route not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source incoming route not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create new incoming route model with copied values
            $newRoute = self::createCopyFromSource($sourceRoute);

            // Create data structure for the copied incoming route
            $res->data = DataStructure::createFromModel($newRoute);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying incoming route: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of incoming route from source record
     *
     * @param IncomingRoutingTable $sourceRoute
     * @return IncomingRoutingTable
     */
    private static function createCopyFromSource(IncomingRoutingTable $sourceRoute): IncomingRoutingTable
    {
        $newRoute = new IncomingRoutingTable();

        // Generate new ID
        $newRoute->id = '';

        // Get next available priority
        $maxPriority = IncomingRoutingTable::maximum([
            'column' => 'priority',
            'conditions' => 'priority != 9999'
        ]);
        $newRoute->priority = $maxPriority ? ($maxPriority + 1) : 1;

        // Copy all other fields from source
        $newRoute->provider = $sourceRoute->provider;
        $newRoute->number = $sourceRoute->number;
        $newRoute->extension = $sourceRoute->extension;
        $newRoute->timeout = $sourceRoute->timeout;
        $newRoute->audio_message_id = $sourceRoute->audio_message_id;
        $newRoute->note = $sourceRoute->note;

        return $newRoute;
    }
}
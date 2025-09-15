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
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying an outbound route
 *
 * This action creates a copy of an existing outbound route with:
 * - New ID (auto-increment)
 * - Name suffixed with " - Copy"
 * - Priority set to last position
 * - All other settings copied
 *
 * @api {get} /pbxcore/api/v3/outbound-routes/{id}:copy Copy outbound route
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup OutboundRoutes
 *
 * @apiParam {String} id Source outbound route ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied outbound route data ready for creation
 * @apiSuccess {String} data.id Empty string (will be auto-generated)
 * @apiSuccess {String} data.rulename Name suffixed with " - Copy"
 * @apiSuccess {String} data.priority New priority (last position)
 */
class CopyRecordAction
{
    /**
     * Copy outbound route record with new ID and priority
     *
     * @param string $sourceId Source outbound route ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source outbound route
            $sourceRoute = OutgoingRoutingTable::findFirst((int)$sourceId);

            if (!$sourceRoute) {
                $res->messages['error'][] = "Source outbound route not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source outbound route not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create copy of the route
            $newRoute = self::createCopyFromSource($sourceRoute);

            // Create data structure for the copied route
            $res->data = DataStructure::createFromModel($newRoute);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying outbound route: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of outbound route from source record
     *
     * @param OutgoingRoutingTable $sourceRoute
     * @return OutgoingRoutingTable
     */
    private static function createCopyFromSource(OutgoingRoutingTable $sourceRoute): OutgoingRoutingTable
    {
        $newRoute = new OutgoingRoutingTable();

        // Clear ID for new record (auto-increment)
        $newRoute->id = '';

        // Get new priority (last position)
        $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
        $newRoute->priority = (string)((int)$maxPriority + 1);

        // Copy all other fields
        $newRoute->rulename = $sourceRoute->rulename . ' - Copy';
        $newRoute->providerid = $sourceRoute->providerid;
        $newRoute->numberbeginswith = $sourceRoute->numberbeginswith;
        $newRoute->restnumbers = $sourceRoute->restnumbers;
        $newRoute->trimfrombegin = $sourceRoute->trimfrombegin;
        $newRoute->prepend = $sourceRoute->prepend;
        $newRoute->note = $sourceRoute->note;
        $newRoute->disabled = '0'; // Enable by default

        return $newRoute;
    }
}
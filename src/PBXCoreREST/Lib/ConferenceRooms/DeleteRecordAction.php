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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting conference room record
 * 
 * Extends AbstractDeleteAction to leverage:
 * - Standard record deletion patterns
 * - Automatic extension cleanup
 * - Transaction-based deletion
 * - Consistent error handling and logging
 * 
 * @api {delete} /pbxcore/api/v2/conference-rooms/deleteRecord/:id Delete conference room
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} id Record ID to delete (uniqid)
 * 
 * @apiSuccess {Boolean} result Operation result
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete conference room record
     * 
     * @param string $id Record ID to delete (expects uniqid)
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        // Use standard delete execution from parent class
        return self::executeStandardDelete(
            ConferenceRooms::class,
            $id,
            'Conference room',                  // Entity type for logging
            'Conference room not found'         // Not found error message
        );
    }
}